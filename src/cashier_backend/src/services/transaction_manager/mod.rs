use std::{collections::HashMap, time::Duration};

use action::ActionService;
use cashier_types::{Intent, LinkAction, Transaction, TransactionState};
use icrc_ledger_types::icrc1::account::Account;
use manual_check_status::ManualCheckStatusService;
use timeout::tx_timeout_task;
use transaction::TransactionService;

use crate::{
    core::action::types::ActionDto,
    info,
    types::{
        error::CanisterError, icrc_112_transaction::Icrc112Requests, temp_action::TemporaryAction,
        transaction_manager::ActionResp,
    },
    utils::runtime::{IcEnvironment, RealIcEnvironment},
};

pub mod action;
pub mod action_adapter;
pub mod builder;
pub mod execute_transaction;
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
    action_service: ActionService<E>,
    manual_check_status_service: ManualCheckStatusService<E>,
    ic_env: E,
    execute_transaction_service: execute_transaction::ExecuteTransactionService,
}

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService<E>,
        action_service: ActionService<E>,
        manual_check_status_service: ManualCheckStatusService<E>,
        ic_env: E,
        execute_transaction_service: execute_transaction::ExecuteTransactionService,
    ) -> Self {
        Self {
            transaction_service,
            action_service,
            manual_check_status_service,
            ic_env,
            execute_transaction_service,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionService::get_instance(),
            ActionService::get_instance(),
            ManualCheckStatusService::get_instance(),
            IcEnvironment::new(),
            execute_transaction::ExecuteTransactionService::get_instance(),
        )
    }

    pub fn assemble_txs(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError> {
        let intent_adapter = intent_adapter::ic_adapter::IcAdapter::new(&self.ic_env);

        let txs = intent_adapter
            .convert(intent)
            .map_err(|e| CanisterError::HandleLogicError(format!("Tx assemble error: {}", e)))?;

        Ok(txs)
    }

    pub fn create_action(&self, temp_action: &TemporaryAction) -> Result<ActionDto, CanisterError> {
        let mut intent_tx_hashmap: HashMap<String, Vec<Transaction>> = HashMap::new();

        // check action id
        let action = self.action_service.get_action_by_id(temp_action.id.clone());
        if action.is_some() {
            return Err(CanisterError::HandleLogicError(
                "Action already exists".to_string(),
            ));
        }

        // fill in tx info
        for intent in temp_action.intents.iter() {
            let txs = self.assemble_txs(intent)?;
            intent_tx_hashmap.insert(intent.id.clone(), txs);
        }

        let link_action = LinkAction {
            link_id: temp_action.link_id.clone(),
            action_type: temp_action.r#type.to_string().clone(),
            action_id: temp_action.id.clone(),
        };

        // save action to DB
        let _ = self.action_service.store_action_records(
            link_action,
            temp_action.as_action(),
            temp_action.intents.clone(),
            intent_tx_hashmap,
            temp_action.creator.clone(),
        );

        Ok(ActionDto::from(
            temp_action.as_action(),
            temp_action.intents.clone(),
        ))
    }

    pub fn update_tx_state(
        &self,
        tx: &mut Transaction,
        state: TransactionState,
    ) -> Result<(), String> {
        self.transaction_service.update_tx_state(tx, state)
    }

    fn _is_group_has_dependency(&self, transaction: &Transaction) -> Result<bool, CanisterError> {
        let action = self
            .action_service
            .get_action_by_tx_id(transaction.id.clone())
            .unwrap();

        let txs_in_group = action
            .get_txs_of_tx_group(transaction.id.clone())
            .map_err(|e| CanisterError::NotFound(format!("Error getting txs in group: {}", e)))?;

        let other_txs_in_group: Vec<&String> = txs_in_group
            .iter()
            .filter(|id| id.to_string() != transaction.id.clone())
            .collect();

        let is_any_txs_has_dependency = if other_txs_in_group.len() == 0 {
            false
        } else {
            let res = other_txs_in_group
                .iter()
                .map(|id| {
                    let tx_in_group = self.transaction_service.get_tx_by_id(*id).map_err(|e| {
                        CanisterError::NotFound(format!("Error getting tx in group: {}", e))
                    })?;
                    let is_all_depdendency_success =
                        self._is_all_depdendency_success(&tx_in_group, true);

                    return is_all_depdendency_success;
                })
                .collect::<Result<Vec<bool>, CanisterError>>()?;

            res.iter().any(|x| *x == false)
        };

        Ok(is_any_txs_has_dependency)
    }

    // if is_skip_check_in_group is true, then skip checking the dependency in the same group
    fn _is_all_depdendency_success(
        &self,
        tx: &Transaction,
        is_skip_check_in_group: bool,
    ) -> Result<bool, CanisterError> {
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

            let txs_to_check: Vec<&Transaction> = match is_skip_check_in_group {
                true => txs
                    .iter()
                    .filter(|check_tx| check_tx.group != tx.group)
                    .collect::<Vec<&Transaction>>(),
                false => txs.iter().collect::<Vec<&Transaction>>(),
            };

            let is_all_tx_success: bool = txs_to_check
                .iter()
                .all(|tx| tx.state == TransactionState::Success);

            is_all_tx_success
        };

        Ok(is_all_dependencies_success)
    }

    pub async fn has_dependency(&self, tx_id: String) -> Result<bool, CanisterError> {
        let tx: Transaction = self
            .transaction_service
            .get_tx_by_id(&tx_id)
            .map_err(|e| CanisterError::NotFound(e))?;

        let is_all_dependencies_success = self._is_all_depdendency_success(&tx, true)?;

        let is_group_has_dependency = self._is_group_has_dependency(&tx)?;

        // if any of the tx in the group has dependency (exclusive the tx in same group), then current tx has dependency
        // if all success then no dependency
        //|                                   | `is_all_dependencies_success = false`   | `is_all_dependencies_success = true`   |
        //|--------------------------         |--------------------------------------   |--------------------------------------- |
        //| `is_group_has_dependency = false` | `true`                                  | `false`                                 |
        //| `is_group_has_dependency = true`  | `true`                                  | `true`                                 |

        if is_all_dependencies_success == true && is_group_has_dependency == false {
            return Ok(false);
        } else {
            return Ok(true);
        }
    }

    pub fn create_icrc_112(
        &self,
        caller: Account,
        action_id: String,
        link_id: String,
        txs: &Vec<Transaction>,
    ) -> Result<Option<Icrc112Requests>, CanisterError> {
        let mut tx_execute_from_user_wallet = vec![];

        for tx in txs {
            let from_account = tx
                .try_get_from_account()
                .map_err(|e| CanisterError::InvalidDataError(e.to_string()))?;
            if from_account == caller {
                tx_execute_from_user_wallet.push(tx.clone());
            }
        }

        Ok(self.transaction_service.create_icrc_112(
            action_id,
            link_id,
            &tx_execute_from_user_wallet,
        ))
    }

    pub async fn execute_tx_by_id(&self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self
            .transaction_service
            .get_tx_by_id(&tx_id)
            .map_err(|e| CanisterError::NotFound(e))?;

        self.execute_canister_tx(&mut tx).await
    }

    pub async fn execute_canister_tx(&self, tx: &mut Transaction) -> Result<(), CanisterError> {
        if tx.from_call_type == cashier_types::FromCallType::Canister {
            // the tx should not have any dependencies
            let is_all_dependencies_success = self._is_all_depdendency_success(&tx, true)?;
            if is_all_dependencies_success {
                // right now only handle transfer from
                match self.execute_transaction_service.execute(tx).await {
                    Ok(_) => {
                        info!("Transaction executed successfully");
                        self.update_tx_state(tx, TransactionState::Success)
                            .map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error updating tx state: {}",
                                    e
                                ))
                            })?;
                        let action_resp = self
                            .action_service
                            .get_action_by_tx_id(tx.id.clone())
                            .map_err(|e| CanisterError::NotFound(e))?;

                        info!("after update action_resp {:#?}", action_resp);
                    }
                    Err(e) => {
                        info!("Transaction executed with error {}", e);
                        self.update_tx_state(tx, TransactionState::Fail)
                            .map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error updating tx state: {}",
                                    e
                                ))
                            })?;
                        return Err(CanisterError::HandleLogicError(format!(
                            "Error executing tx: {}",
                            e
                        )));
                    }
                }
            }
        } else {
            return Err(CanisterError::HandleLogicError(
                "Invalid from_call_type".to_string(),
            ));
        }

        return Ok(());
    }

    pub async fn execute_tx(&self, tx: &mut Transaction) -> Result<(), CanisterError> {
        self.spawn_tx_timeout_task(tx.id.clone()).map_err(|e| {
            CanisterError::HandleLogicError(format!("Error spawning tx timeout task: {}", e))
        })?;
        self.update_tx_state(tx, TransactionState::Processing)
            .map_err(|e| {
                CanisterError::HandleLogicError(format!("Error updating tx state: {}", e))
            })?;

        Ok(())
    }

    pub fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String> {
        let tx_id = tx_id.clone();

        let _time_id = self.ic_env.set_timer(Duration::from_secs(300), move || {
            let ic_env_in_future = RealIcEnvironment::new();

            ic_env_in_future.spawn(async move {
                let res = tx_timeout_task(tx_id).await;
                match res {
                    Ok(_) => {
                        info!("Transaction timeout task executed successfully");
                    }
                    Err(e) => {
                        info!("Transaction timeout task executed with error: {}", e);
                    }
                }
            });
        });
        Ok(())
    }

    pub async fn update_action(&self, args: UpdateActionArgs) -> Result<ActionDto, CanisterError> {
        let action_resp = self
            .action_service
            .get(args.action_id.clone())
            .map_err(|e| CanisterError::NotFound(e))?;

        let txs = self
            .action_service
            .flatten_tx_hashmap(&action_resp.intent_txs);

        // manually check the status of the tx of the action
        // update status to whaterver is returned by the manual check
        for mut tx in txs.clone() {
            let new_state = self.manual_check_status_service.execute(&tx).await?;
            info!("TX  {:#?}, New state: {:#?}", tx.protocol, new_state);
            if tx.state == new_state.clone() {
                continue;
            }

            self.transaction_service
                .update_tx_state(&mut tx, new_state)
                .map_err(|e| CanisterError::UnknownError(e))?;
        }

        let mut request = None;

        // check which tx are eligible to be executed
        // if tx has no dependent txs, that need to be completed before executing it, it is not eligible
        // if all the dependent txs were complete, it is eligible to be executed
        // There are two exceptions (handled within dependency check method):
        // 1. if tx is grouped with other txs into ICRC-112, dependency with other tx in the batch is ignored
        // 2. if tx is gropued with other txs into ICRc-112, and execute_wallet_tx = false tx is ineligible
        let all_txs = match self.action_service.get(args.action_id.clone()) {
            Ok(action_resp) => self
                .action_service
                .flatten_tx_hashmap(&action_resp.intent_txs),
            Err(e) => {
                return Err(CanisterError::InvalidDataError(e));
            }
        };
        let mut eligible_txs: Vec<Transaction> = Vec::new();
        for tx in all_txs.iter() {
            // REFACTOR LATER : we should refactor later to make default condition to false
            let mut eligible = true;

            // we only need to check if tx in created or failed states should be executed
            // there is no point in re-executing tx that are already success or progressing
            if tx.state == TransactionState::Success || tx.state == TransactionState::Processing {
                eligible = false;
            }

            // check if tx has dependent txs that need to be completed before executing it
            match self.has_dependency(tx.id.clone()).await {
                Ok(has_dependency) => {
                    if has_dependency {
                        eligible = false;
                    }
                }
                Err(e) => {
                    return Err(e);
                }
            }

            // if tx has no dependent txs, that need to be completed before executing it, we can execute it
            if eligible {
                eligible_txs.push(tx.clone());
            }
        }

        let caller = Account {
            owner: self.ic_env.caller(),
            subaccount: None,
        };
        // This is where you create icrc_112
        let icrc_112_requests = self.create_icrc_112(
            caller,
            args.action_id.clone(),
            args.link_id.clone(),
            &eligible_txs,
        )?;

        request = if icrc_112_requests.is_none() {
            None
        } else if icrc_112_requests.as_ref().unwrap().len() == 0 {
            None
        } else {
            Some(icrc_112_requests.unwrap())
        };

        // This is where execute transaction
        for mut tx in eligible_txs {
            self.execute_tx(&mut tx).await?;
        }

        let get_resp: ActionResp = self
            .action_service
            .get(args.action_id.clone())
            .map_err(|e| CanisterError::InvalidDataError(format!("Error getting action: {}", e)))?;

        Ok(ActionDto::build(
            get_resp.action,
            get_resp.intents,
            get_resp.intent_txs,
            request,
        ))
    }
}

#[cfg(test)]
pub mod __tests__;
