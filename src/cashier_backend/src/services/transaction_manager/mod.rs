use std::{collections::HashMap, time::Duration};

use action::ActionService;
use cashier_types::{
    Chain, Intent, IntentTask, IntentType, LinkAction, Transaction, TransactionState,
};
use icrc_ledger_types::icrc1::account::Account;
use manual_check_status::ManualCheckStatusService;
use timeout::tx_timeout_task;
use transaction::TransactionService;

use crate::{
    core::action::types::ActionDto,
    info,
    types::{
        error::CanisterError, icrc_112_transaction::Icrc112Requests, temp_action::TemporaryAction,
        transaction_manager::ActionData,
    },
    utils::{
        self,
        helper::to_subaccount,
        runtime::{IcEnvironment, RealIcEnvironment},
    },
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
    // using for marking the method called outside of icrc-112
    pub execute_wallet_tx: bool,
}

#[cfg_attr(test, faux::create)]
pub struct TransactionManagerService<E: IcEnvironment + Clone> {
    transaction_service: TransactionService<E>,
    action_service: ActionService<E>,
    manual_check_status_service: ManualCheckStatusService<E>,
    ic_env: E,
    execute_transaction_service: execute_transaction::ExecuteTransactionService,
}

#[cfg_attr(test, faux::methods)]
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

    pub fn tx_man_assemble_txs(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError> {
        match intent.chain {
            Chain::IC => {
                let intent_adapter = intent_adapter::ic_adapter::IcAdapter::new(&self.ic_env);

                match (intent.r#type.clone(), intent.task.clone()) {
                    (IntentType::Transfer(transfer_intent), IntentTask::TransferWalletToLink) => {
                        intent_adapter.tx_man_ic_assemble_icrc1_wallet_transfer(transfer_intent)
                    }
                    (
                        IntentType::TransferFrom(transfer_intent),
                        IntentTask::TransferWalletToTreasury,
                    ) => intent_adapter.tx_man_ic_assemble_icrc2_wallet_transfer(transfer_intent),
                    (IntentType::Transfer(transfer_intent), IntentTask::TransferLinkToWallet) => {
                        intent_adapter.tx_man_ic_assemble_icrc1_canister_transfer(transfer_intent)
                    }
                    // Add other combinations as needed
                    _ => Err(CanisterError::InvalidDataError(format!(
                        "Unsupported intent type or task {:#?} {:#?}",
                        intent.r#type.clone(),
                        intent.task.clone()
                    )))?,
                }
            }
        }
    }

    pub fn tx_man_create_action(
        &self,
        temp_action: &TemporaryAction,
    ) -> Result<ActionDto, CanisterError> {
        let mut intent_tx_hashmap: HashMap<String, Vec<Transaction>> = HashMap::new();
        let mut intent_tx_ids_hashmap: HashMap<String, Vec<String>> = HashMap::new();

        // check action id
        let action = self.action_service.get_action_by_id(temp_action.id.clone());
        if action.is_some() {
            return Err(CanisterError::HandleLogicError(
                "Action already exists".to_string(),
            ));
        }

        // fill in tx info
        // enrich each intent with chain-level txs needed to achieve the intent
        for intent in temp_action.intents.iter() {
            // store txs in hashmap
            let txs = self.tx_man_assemble_txs(intent)?;
            intent_tx_hashmap.insert(intent.id.clone(), txs.clone());

            // store tx ids in hashmap
            let tx_ids: Vec<String> = txs.iter().map(|tx| tx.id.clone()).collect();
            intent_tx_ids_hashmap.insert(intent.id.clone(), tx_ids);
        }

        // fill in dependency info
        // if intent A has dependency on intent B, all tx in A will have dependency on txs in B
        for intent in temp_action.intents.iter() {
            // collect the tx ids of the dependencies
            // if not found throw error
            let dependency_tx_ids: Vec<String> = intent
                .dependency
                .iter()
                .map(|dependency_id| {
                    intent_tx_ids_hashmap
                        .get(dependency_id)
                        .ok_or_else(|| {
                            CanisterError::InvalidDataError(format!(
                                "Dependency ID {} not found",
                                dependency_id
                            ))
                        })
                        .map(|tx_ids| tx_ids.clone())
                })
                .collect::<Result<Vec<Vec<String>>, CanisterError>>()?
                .into_iter()
                .flatten()
                .collect();

            if !dependency_tx_ids.is_empty() {
                // store the dependency tx ids in the tx of current intent
                let txs = intent_tx_hashmap.get_mut(&intent.id).unwrap();
                for tx in txs.iter_mut() {
                    // if the tx already has dependency, then extend the existing dependency
                    match &mut tx.dependency {
                        Some(existing_deps) => {
                            existing_deps.extend(dependency_tx_ids.clone());
                        }
                        None => {
                            tx.dependency = Some(dependency_tx_ids.clone());
                        }
                    }
                }
            }
        }

        // set link_user_state based on action type
        // if action type is claim, then set link_user_state to ChooseWallet
        // else set it to None

        let link_action = LinkAction {
            link_id: temp_action.link_id.clone(),
            action_type: temp_action.r#type.to_string().clone(),
            action_id: temp_action.id.clone(),
            user_id: temp_action.creator.clone(),
            link_user_state: temp_action.default_link_user_state.clone(),
        };

        // save action to DB
        let _ = self.action_service.store_action_data(
            link_action,
            temp_action.as_action(),
            temp_action.intents.clone(),
            intent_tx_hashmap.clone(),
            temp_action.creator.clone(),
        );

        Ok(ActionDto::from_with_tx(
            temp_action.as_action(),
            temp_action.intents.clone(),
            intent_tx_hashmap,
        ))
    }

    pub fn update_tx_state(
        &self,
        tx: &mut Transaction,
        state: &TransactionState,
    ) -> Result<(), CanisterError> {
        info!(
            "Updating tx {} state from {:?} to {:?}",
            tx.id.clone(),
            tx.state.clone(),
            state.clone()
        );
        // update tx state
        self.transaction_service.update_tx_state(tx, state)?;
        // roll up
        self.action_service
            .roll_up_state(tx.id.clone())
            .map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Failed to roll up state for action: {}",
                    e
                ))
            })?;

        Ok(())
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
        let tx: Transaction = self.transaction_service.get_tx_by_id(&tx_id)?;

        // checks if tx has other dependent txs that were not completed yet
        let is_all_dependencies_success = self._is_all_depdendency_success(&tx, true)?;

        // checks if tx is part of a batch of txs (ICRC-112)
        // tx is deemed has dependency if any of the other txs in the batch still has unmet dependencies
        // this is done so that al the txs in the batch can be executed altogether, not separately
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
        caller: &Account,
        action_id: &str,
        link_id: &str,
        txs: &Vec<Transaction>,
    ) -> Result<Option<Icrc112Requests>, CanisterError> {
        let mut tx_execute_from_user_wallet = vec![];

        for tx in txs {
            let from_account = tx
                .try_get_from_account()
                .map_err(|e| CanisterError::InvalidDataError(e.to_string()))?;
            // check from_account is caller or not
            if from_account == *caller {
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
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;

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
                        self.update_tx_state(tx, &TransactionState::Success)
                            .map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error updating tx state: {}",
                                    e
                                ))
                            })?;
                    }
                    Err(e) => {
                        self.update_tx_state(tx, &TransactionState::Fail)
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

        self.update_tx_state(tx, &TransactionState::Processing)
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
                    Ok(_) => {}
                    Err(e) => {
                        info!("Transaction timeout task executed with error: {}", e);
                    }
                }
            });
        });
        Ok(())
    }

    pub async fn update_action(&self, args: UpdateActionArgs) -> Result<ActionDto, CanisterError> {
        let action_data = self
            .action_service
            .get_action_data(args.action_id.clone())
            .map_err(|e| CanisterError::NotFound(e))?;

        let txs = utils::collections::flatten_hashmap_values(&action_data.intent_txs);

        // manually check the status of the tx of the action
        // update status to whaterver is returned by the manual check
        for mut tx in txs.clone() {
            let new_state = self
                .manual_check_status_service
                .execute(&tx, txs.clone())
                .await?;
            if tx.state == new_state.clone() {
                continue;
            }

            self.update_tx_state(&mut tx, &new_state)?
        }

        let mut request = None;

        // check which tx are eligible to be executed
        // if tx has dependent txs, that need to be completed before executing it, it is not eligible
        // if all the dependent txs were complete, it is eligible to be executed
        // There are additional conditions (handled in has_dependency method below):
        // - if tx is grouped into a batch ICRC-112, dependency between txs in the batch is ignored during eligibility check
        // - if tx is gropued into a batch ICRC-112, tx is only eligible if all other tx in batch have no dependencies (so that al txs can be executed in batch together)
        // - if execute_wallet_tx = fase, all tx grouped into a batach ICRC-112 are not eligible. client calls update_action with this arg to relay ICRC-112 reponse to tx manager, so we don't want to execute wallet tx again.
        let all_txs = match self.action_service.get_action_data(args.action_id.clone()) {
            Ok(action_data) => utils::collections::flatten_hashmap_values(&action_data.intent_txs),
            Err(e) => {
                return Err(CanisterError::InvalidDataError(e));
            }
        };

        // User wallet account
        let caller = Account {
            owner: self.ic_env.caller(),
            subaccount: None,
        };

        // Link Vault account
        let link_vault = Account {
            owner: self.ic_env.id(),
            subaccount: Some(to_subaccount(&args.link_id.clone())),
        };

        // Directly identify eligible transactions while separating by type
        let mut eligible_wallet_txs: Vec<Transaction> = Vec::new();
        let mut eligible_canister_txs: Vec<Transaction> = Vec::new();

        for tx in all_txs.iter() {
            // Skip transactions that aren't in Created or Failed state
            if tx.state != TransactionState::Created && tx.state != TransactionState::Fail {
                continue;
            }

            // Check if tx has dependencies that need to be completed first
            let has_dependency = match self.has_dependency(tx.id.clone()).await {
                Ok(has_dep) => has_dep,
                Err(e) => return Err(e),
            };

            // Skip transactions with unresolved dependencies
            if has_dependency {
                continue;
            }

            // Transaction is eligible, categorize it based on from_account
            let from_account = match tx.try_get_from_account() {
                Ok(account) => account,
                Err(e) => return Err(CanisterError::InvalidDataError(e.to_string())),
            };

            if from_account == caller {
                eligible_wallet_txs.push(tx.clone());
            } else if from_account == link_vault {
                eligible_canister_txs.push(tx.clone());
            }
            // Right now there is no tx have from_account is neither caller nor link_vault, so we don't need to handle this case
        }

        if !args.execute_wallet_tx {
            // With the txs that were grouped into a batch, we assemble a icrc_112 request
            let icrc_112_requests = self.create_icrc_112(
                &caller,
                &args.action_id,
                &args.link_id,
                &eligible_wallet_txs,
            )?;

            request = if icrc_112_requests.is_none() {
                None
            } else if icrc_112_requests.as_ref().unwrap().len() == 0 {
                None
            } else {
                Some(icrc_112_requests.unwrap())
            };

            // We execute transactions

            // Wallet tx are executed by the client, when it receives the ICRC-112 request this method returns
            // and tx status is 'processing' until client updates tx manager with response of ICRC-112
            for mut tx in eligible_wallet_txs {
                self.spawn_tx_timeout_task(tx.id.clone()).map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "Error spawning tx timeout task: {}",
                        e
                    ))
                })?;
                self.update_tx_state(&mut tx, &TransactionState::Processing)
                    .map_err(|e| {
                        CanisterError::HandleLogicError(format!("Error updating tx state: {}", e))
                    })?;
            }

            // Canister tx are executed here directly and tx status is updated to 'success' or 'fail' right away
            for mut tx in eligible_canister_txs {
                self.spawn_tx_timeout_task(tx.id.clone()).map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "Error spawning tx timeout task: {}",
                        e
                    ))
                })?;
                self.update_tx_state(&mut tx, &TransactionState::Processing)
                    .map_err(|e| {
                        CanisterError::HandleLogicError(format!("Error updating tx state: {}", e))
                    })?;

                // this method update the tx state to success or fail inside of it
                self.execute_canister_tx(&mut tx).await?;
            }
        }

        let get_resp: ActionData = self
            .action_service
            .get_action_data(args.action_id.clone())
            .map_err(|e| CanisterError::InvalidDataError(format!("Error getting action: {}", e)))?;

        Ok(ActionDto::build(
            get_resp.action,
            get_resp.intents,
            get_resp.intent_txs,
            request,
        ))
    }
}
