use std::time::Duration;

use action::ActionService;
use cashier_types::{FromCallType, Transaction, TransactionState};
use manual_check_status::ManualCheckStatusService;
use timeout::tx_timeout_task;
use transaction::TransactionService;

use crate::{
    core::action::types::ActionDto,
    info,
    types::{error::CanisterError, icrc_112_transaction::Icrc112Requests},
    utils::runtime::{IcEnvironment, RealIcEnvironment},
};

pub mod action;
pub mod action_adapter;
pub mod builder;
pub mod create;
pub mod fee;
pub mod intent_adapter;
pub mod manual_check_status;
pub mod timeout;
pub mod transaction;
pub mod validate;

#[derive(Debug, Clone)]
pub struct UpdateActionArgs {
    pub action_id: String,
    pub link_id: String,
    pub external: bool,
}

pub struct TransactionManagerService<E: IcEnvironment + Clone> {
    transaction_service: TransactionService<E>,
    action_service: ActionService,
    manual_check_status_service: ManualCheckStatusService<E>,
    ic_env: E,
}

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService<E>,
        action_service: ActionService,
        manual_check_status_service: ManualCheckStatusService<E>,
        ic_env: E,
    ) -> Self {
        Self {
            transaction_service,
            action_service,
            manual_check_status_service,
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionService::get_instance(),
            ActionService::get_instance(),
            ManualCheckStatusService::get_instance(),
            IcEnvironment::new(),
        )
    }

    pub fn update_tx_state(
        &self,
        tx: &mut Transaction,
        state: TransactionState,
    ) -> Result<(), String> {
        self.transaction_service.update_tx_state(tx, state)
    }

    pub async fn manual_check_status(
        &self,
        transaction: &Transaction,
    ) -> Result<TransactionState, CanisterError> {
        self.manual_check_status_service.execute(transaction).await
    }

    pub fn has_dependency(&self, tx_id: String) -> Result<bool, CanisterError> {
        let tx = self
            .transaction_service
            .get_tx_by_id(&tx_id)
            .map_err(|e| CanisterError::NotFound(e))?;

        // if there no dependency treat it as true
        let is_all_dependencies_success = if tx.dependency.is_none() {
            true
        } else if tx.dependency.as_ref().unwrap().iter().len() == 0 {
            true
        } else {
            let dependencies = tx.dependency.as_ref().unwrap();
            let txs = self
                .transaction_service
                .batch_get(dependencies.clone())
                .map_err(|e| {
                    CanisterError::NotFound(format!("Error getting dependencies: {}", e))
                })?;

            let is_all_tx_success: bool =
                txs.iter().all(|tx| tx.state == TransactionState::Success);

            is_all_tx_success
        };

        let action = self
            .action_service
            .get_action_by_tx_id(tx_id.clone())
            .unwrap();

        let txs_in_group = action
            .get_txs_of_tx_group(tx_id.clone())
            .map_err(|e| CanisterError::NotFound(format!("Error getting txs in group: {}", e)))?;

        let other_txs_in_group: Vec<&String> = txs_in_group
            .iter()
            .filter(|id| id.to_string() != tx_id.clone())
            .collect();

        let is_any_txs_has_dependency = if other_txs_in_group.len() == 0 {
            false
        } else {
            other_txs_in_group.iter().any(|id| {
                let tx_has_dependency = self.has_dependency(id.to_string()).unwrap();
                tx_has_dependency
            })
        };

        Ok(!is_all_dependencies_success && !is_any_txs_has_dependency)
    }

    pub fn create_icrc_112(&self) -> Result<(), String> {
        Ok(())
    }

    pub fn execute_tx(&self, tx: &mut Transaction) -> Result<(), String> {
        self.spawn_tx_timeout_task(tx.id.clone())?;
        self.update_tx_state(tx, TransactionState::Processing)?;

        Ok(())
    }

    pub fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String> {
        let ic_env = self.ic_env.clone();
        let tx_id = tx_id.clone();

        info!("Spawn tx timeout task for tx_id: {}", tx_id);

        let _time_id = ic_env.set_timer(Duration::from_secs(120), move || {
            let ic_env_in_future = RealIcEnvironment::new();

            ic_env_in_future.spawn(async move {
                let _ = tx_timeout_task(tx_id).await;
            });
        });
        Ok(())
    }

    pub async fn update_action(&self, args: UpdateActionArgs) -> Result<ActionDto, CanisterError> {
        let action_resp = self
            .action_service
            .get(args.action_id.clone())
            .ok_or_else(|| CanisterError::NotFound("Action not found".to_string()))?;

        let txs = self
            .action_service
            .flatten_tx_hashmap(&action_resp.intent_txs);

        // manually check the status of the tx of the action
        // update status to whaterver is returned by the manual check
        for mut tx in txs.clone() {
            let new_state = self.manual_check_status_service.execute(&tx).await?;
            if tx.state == new_state.clone() {
                continue;
            }

            self.transaction_service
                .update_tx_state(&mut tx, new_state)
                .map_err(|e| CanisterError::UnknownError(e))?;
        }

        //Step #2 : Check which txs are eligible to execute - based on dependency
        let all_txs = match self.action_service.get(args.action_id.clone()) {
            Some(action) => self.action_service.flatten_tx_hashmap(&action.intent_txs),
            None => vec![],
        };

        let eligible_txs = all_txs
            .iter()
            .filter(|tx| {
                let mut eligible = true;

                if args.external {
                    if tx.from_call_type == FromCallType::Wallet {
                        eligible = false;
                    }
                }

                // success txs - ignores
                // processing txs - ignores
                if tx.state == TransactionState::Success || tx.state == TransactionState::Processing
                {
                    eligible = false;
                }

                eligible
            })
            .collect::<Vec<&Transaction>>();

        // Step #3 Construct executable tx for the tx that are eligible to execute
        let icrc_112_requests: Icrc112Requests = transaction::icrc_112::create(
            args.link_id.clone(),
            args.action_id.clone(),
            &eligible_txs,
        );

        //Step #4 Actually execute the tx that is elibile
        // for client tx set to processing
        for tx in eligible_txs.clone() {
            self.execute_tx(&mut tx.clone())
                .map_err(|e| CanisterError::UnknownError(e))?;
        }

        // TODO: implement this
        // for backend tx execute the tx

        let request = if icrc_112_requests.len() == 0 {
            None
        } else {
            Some(icrc_112_requests)
        };

        let action_resp = self.action_service.get(args.action_id.clone()).unwrap();

        Ok(ActionDto::build(
            action_resp.action,
            action_resp.intents,
            action_resp.intent_txs,
            request,
        ))
    }
}

#[cfg(test)]
pub mod __tests__;
