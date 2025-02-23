use action::ActionService;
use cashier_types::{FromCallType, Transaction, TransactionState};
use manual_check_status::ManualCheckStatusService;
use transaction::TransactionService;

use crate::{
    core::action::types::ActionDto,
    types::{error::CanisterError, icrc_112_transaction::Icrc112Requests},
    utils::runtime::IcEnvironment,
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
pub mod update_action;
pub mod validate;

#[derive(Debug, Clone)]
pub struct UpdateActionArgs {
    pub action_id: String,
    pub link_id: String,
    pub external: bool,
}

pub struct TransactionManagerService<E: IcEnvironment> {
    transaction_service: TransactionService,
    action_service: ActionService,
    manual_check_status_service: ManualCheckStatusService<E>,
}

impl<E: IcEnvironment> TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService,
        action_service: ActionService,
        manual_check_status_service: ManualCheckStatusService<E>,
    ) -> Self {
        Self {
            transaction_service,
            action_service,
            manual_check_status_service,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionService::get_instance(),
            ActionService::get_instance(),
            ManualCheckStatusService::get_instance(),
        )
    }

    pub fn update_tx_state(&self) -> () {
        print!("update_tx_state");
    }

    pub async fn manual_check_status(
        &self,
        transaction: &Transaction,
    ) -> Result<TransactionState, CanisterError> {
        self.manual_check_status_service.execute(transaction).await
    }

    pub fn has_depedency(&self) -> () {
        print!("update_tx_state");
    }

    pub fn create_icrc_112(&self) -> Result<(), String> {
        Ok(())
    }

    pub fn execute_tx(&self, tx: &mut Transaction) -> Result<(), String> {
        self.spawn_tx_timeout_task()?;
        self.transaction_service
            .update_tx_state(tx, TransactionState::Processing)?;

        Ok(())
    }

    pub fn spawn_tx_timeout_task(&self) -> Result<(), String> {
        Ok(())
    }

    pub fn tx_timeout_task(&self) -> Result<(), String> {
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
