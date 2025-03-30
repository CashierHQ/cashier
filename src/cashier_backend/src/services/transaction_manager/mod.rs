use std::{collections::HashMap, str::FromStr, time::Duration};

use adapter::AdapterRegistry;
use candid::Nat;
use cashier_types::{
    FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent,
    LinkAction, Protocol, Transaction, TransactionState,
};
use icrc_ledger_types::{
    icrc1::{account::Account, transfer::TransferArg},
    icrc2::transfer_from::TransferFromArgs,
};

use super::{action::ActionService, transaction::TransactionService};
use crate::{
    constant::{get_tx_timeout_nano_seconds, get_tx_timeout_seconds},
    core::action::types::ActionDto,
    info,
    types::{
        error::CanisterError, icrc_112_transaction::Icrc112Requests, temp_action::TemporaryAction,
        transaction_manager::ActionData,
    },
    utils::{
        self,
        helper::to_subaccount,
        icrc::IcrcService,
        runtime::{IcEnvironment, RealIcEnvironment},
    },
};

mod adapter;
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
    ic_env: E,
    icrc_service: IcrcService,
    // Adapter registry
    adapter_registry: AdapterRegistry<E>,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService<E>,
        action_service: ActionService<E>,
        ic_env: E,
        icrc_service: IcrcService,
        adapter_registry: AdapterRegistry<E>,
    ) -> Self {
        Self {
            transaction_service,
            action_service,
            ic_env,
            icrc_service,
            adapter_registry,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionService::get_instance(),
            ActionService::get_instance(),
            IcEnvironment::new(),
            IcrcService::new(),
            AdapterRegistry::new(),
        )
    }

    pub fn tx_man_assemble_txs(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError> {
        let adapter = self
            .adapter_registry
            .get_intent_adapter(intent.chain.clone())
            .map_err(|e| CanisterError::HandleLogicError(e))?;

        adapter
            .intent_to_transactions(intent)
            .map_err(|e| CanisterError::HandleLogicError(e))
    }

    pub fn create_action(&self, temp_action: &TemporaryAction) -> Result<ActionDto, CanisterError> {
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
    /// Execute a transaction by ID
    ///
    /// Fetches transaction by ID and then executes it
    pub async fn execute_tx_by_id(&self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;
        self.execute_canister_tx(&mut tx).await
    }

    /// Execute a canister transaction
    ///
    /// This handles the actual execution of a canister-initiated transaction
    pub async fn execute_canister_tx(&self, tx: &mut Transaction) -> Result<(), CanisterError> {
        if tx.from_call_type == cashier_types::FromCallType::Canister {
            // Check if dependencies are met
            let is_all_dependencies_success = self.is_all_depdendency_success(&tx, true)?;

            if is_all_dependencies_success {
                // Execute the transaction
                match self.execute_transaction(tx).await {
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

    pub async fn execute_icrc2_transfer_from(
        &self,
        tx: &Icrc2TransferFrom,
    ) -> Result<(), CanisterError> {
        let mut args: TransferFromArgs = TransferFromArgs::try_from(tx.clone())
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        // get asset
        let asset = tx
            .asset
            .get_principal()
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        let transfer_amount = u128::try_from(args.amount.clone().0);
        match transfer_amount {
            Ok(amount) => {
                let amount_subtract_fee = {
                    let token_fee = self.icrc_service.fee(asset).await?;
                    amount.checked_sub(token_fee as u128)
                };
                match amount_subtract_fee {
                    Some(amount_subtract_fee) => args.amount = Nat::from(amount_subtract_fee),
                    None => {
                        return Err(CanisterError::HandleLogicError(
                            "Failed to calculate fee".to_string(),
                        ));
                    }
                }
            }

            Err(_) => {
                return Err(CanisterError::HandleLogicError(
                    "Failed to convert fee to u128".to_string(),
                ));
            }
        }

        self.icrc_service.transfer_from(asset, args).await?;

        return Ok(());
    }

    pub async fn execute_icrc1_transfer(&self, tx: &Icrc1Transfer) -> Result<(), CanisterError> {
        let mut args: TransferArg = TransferArg::try_from(tx.clone())
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        // get asset
        let asset = tx
            .asset
            .get_principal()
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        let transfer_amount = u128::try_from(args.amount.clone().0);
        match transfer_amount {
            Ok(amount) => {
                let amount_subtract_fee = {
                    let token_fee = self.icrc_service.fee(asset).await?;
                    amount.checked_sub(token_fee as u128)
                };
                match amount_subtract_fee {
                    Some(amount_subtract_fee) => args.amount = Nat::from(amount_subtract_fee),
                    None => {
                        return Err(CanisterError::HandleLogicError(
                            "Failed to calculate fee".to_string(),
                        ));
                    }
                }
            }

            Err(_) => {
                return Err(CanisterError::HandleLogicError(
                    "Failed to convert fee to u128".to_string(),
                ));
            }
        }

        self.icrc_service.transfer(asset, args).await?;

        return Ok(());
    }

    /// Execute a transaction using the ICRC service
    ///
    /// Core logic for transaction execution
    async fn execute_transaction(&self, transaction: &Transaction) -> Result<(), CanisterError> {
        let from_call_type = transaction.from_call_type.clone();

        match from_call_type {
            FromCallType::Canister => {
                let protocol = transaction.protocol.as_ic_transaction().ok_or_else(|| {
                    CanisterError::HandleLogicError("Unsupported transaction protocol".to_string())
                })?;

                match protocol {
                    // right now only for fee transfer
                    IcTransaction::Icrc2TransferFrom(tx) => {
                        self.execute_icrc2_transfer_from(&tx).await
                    }
                    IcTransaction::Icrc1Transfer(tx) => self.execute_icrc1_transfer(&tx).await,

                    _ => {
                        return Err(CanisterError::HandleLogicError(
                            "Unsupported IcTransaction".to_string(),
                        ));
                    }
                }
            }
            FromCallType::Wallet => {
                return Err(CanisterError::HandleLogicError(
                    "Unsupported from_call_type".to_string(),
                ));
            }
        }
    }

    /// Process transaction execution
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

    pub fn is_group_has_dependency(
        &self,
        transaction: &Transaction,
    ) -> Result<bool, CanisterError> {
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
                        self.is_all_depdendency_success(&tx_in_group, true);

                    return is_all_depdendency_success;
                })
                .collect::<Result<Vec<bool>, CanisterError>>()?;

            res.iter().any(|x| *x == false)
        };

        Ok(is_any_txs_has_dependency)
    }

    // if is_skip_check_in_group is true, then skip checking the dependency in the same group
    pub fn is_all_depdendency_success(
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
        let is_all_dependencies_success = self.is_all_depdendency_success(&tx, true)?;

        // checks if tx is part of a batch of txs (ICRC-112)
        // tx is deemed has dependency if any of the other txs in the batch still has unmet dependencies
        // this is done so that al the txs in the batch can be executed altogether, not separately
        let is_group_has_dependency = self.is_group_has_dependency(&tx)?;

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

    async fn validate_balance_transfer(
        &self,
        icrc1_transfer_info: &Icrc1Transfer,
    ) -> Result<bool, CanisterError> {
        let target = icrc1_transfer_info.to.clone();

        let target_account = Account::from_str(&target.address)
            .map_err(|e| CanisterError::ParseAccountError(e.to_string()))?;

        let asset = icrc1_transfer_info
            .asset
            .get_principal()
            .map_err(|e| CanisterError::ParsePrincipalError(e.to_string()))?;

        let balance = self.icrc_service.balance_of(asset, target_account).await?;

        if balance < icrc1_transfer_info.amount {
            return Ok(false);
        }

        Ok(true)
    }

    async fn validate_allowance(
        &self,
        icrc2_transfer_from_info: &Icrc2Approve,
    ) -> Result<bool, CanisterError> {
        let from_wallet_account = icrc2_transfer_from_info
            .from
            .get_account()
            .map_err(|e| CanisterError::ParseAccountError(e.to_string()))?;

        let spender_account = icrc2_transfer_from_info
            .spender
            .get_account()
            .map_err(|e| {
                CanisterError::ParseAccountError(format!("Error parsing spender: {}", e))
            })?;

        let allowance_amount = icrc2_transfer_from_info.amount;

        let asset = icrc2_transfer_from_info
            .asset
            .get_principal()
            .map_err(|e| CanisterError::ParsePrincipalError(e.to_string()))?;

        let allowance_fee = self
            .icrc_service
            .allowance(asset, from_wallet_account, spender_account)
            .await?;

        if allowance_fee.allowance < Nat::from(allowance_amount) {
            return Ok(false);
        }

        Ok(true)
    }

    pub async fn manual_check_status(
        &self,
        transaction: &Transaction,
        // This is temporary, will be removed when the fee change to icrc1
        txs: Vec<Transaction>,
    ) -> Result<TransactionState, CanisterError> {
        // If the transaction is created, it means it never ran, so no need to check status
        if transaction.state != TransactionState::Processing {
            return Ok(transaction.state.clone());
        }

        // if timeout check the condition
        match &transaction.protocol {
            // Check balance for Icrc1Transfer
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer_info)) => {
                let is_valid = self.validate_balance_transfer(&icrc1_transfer_info).await;

                match is_valid {
                    Ok(valid) => {
                        if valid {
                            Ok(TransactionState::Success)
                        } else {
                            Ok(TransactionState::Fail)
                        }
                    }
                    Err(_) => Ok(TransactionState::Fail),
                }
            }
            // Check allowance for Icrc2Approve
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve_info)) => {
                // THIS IS A HACK to check if the transfer from is success
                // if the transfer from is success then the approve is success
                // TODO: delete this when the fee change to icrc1
                let txs_depended = txs
                    .iter()
                    .filter(|tx| {
                        let has_depended = tx
                            .dependency
                            .iter()
                            .any(|dep| dep.contains(&transaction.id.to_string()));

                        let is_icrc2_transfer_from = tx
                            .protocol
                            .as_ic_transaction()
                            .map(|tx| matches!(tx, IcTransaction::Icrc2TransferFrom(_)))
                            .unwrap_or(false);

                        has_depended && is_icrc2_transfer_from
                    })
                    .collect::<Vec<_>>();

                // if the transfer from is success then return success
                if txs_depended.len() > 0 {
                    let is_all_success = txs_depended
                        .iter()
                        .all(|tx| tx.state == TransactionState::Success);
                    if is_all_success {
                        return Ok(TransactionState::Success);
                    }
                }

                let is_valid = self.validate_allowance(&icrc2_approve_info).await;

                match is_valid {
                    Ok(valid) => {
                        if valid {
                            Ok(TransactionState::Success)
                        } else {
                            Ok(TransactionState::Fail)
                        }
                    }
                    Err(_) => Ok(TransactionState::Fail),
                }
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_)) => {
                // if this being called it mean the tx is timeout -> fail
                return Ok(TransactionState::Fail);
            } // _ => return Err("Invalid protocol".to_string()),
        }
    }
    pub fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String> {
        let tx_id = tx_id.clone();

        let timeout = get_tx_timeout_seconds();

        let _time_id = self
            .ic_env
            .set_timer(Duration::from_secs(timeout), move || {
                let ic_env_in_future = RealIcEnvironment::new();

                ic_env_in_future.spawn(async move {
                    // Create a new instance of your service with the cloned dependencies
                    let service: TransactionManagerService<RealIcEnvironment> =
                        TransactionManagerService::get_instance();

                    // Now use the new service instance
                    let res = service.tx_timeout_task(tx_id).await;
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

    pub async fn tx_timeout_task(&self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;

        if tx.state == TransactionState::Success || tx.state == TransactionState::Fail {
            return Ok(());
        }

        if tx.start_ts.is_none() {
            return Err(CanisterError::HandleLogicError(
                "Transaction start_ts is None".to_string(),
            ));
        }

        let current_ts = ic_cdk::api::time();

        let tx_timeout: u64 = get_tx_timeout_nano_seconds();

        if current_ts - tx.start_ts.unwrap() >= tx_timeout {
            let state = self.manual_check_status(&tx, vec![]).await?;

            let _ = self
                .transaction_service
                .update_tx_state(&mut tx, &state.clone());

            self.action_service
                .roll_up_state(tx.id.clone())
                .map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "Failed to roll up state for action: {}",
                        e
                    ))
                })?;

            Ok(())
        } else {
            return Err(CanisterError::ValidationErrors(
                "Transaction is not timeout".to_string(),
            ));
        }
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
            let new_state = self.manual_check_status(&tx, txs.clone()).await?;
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

        // only for ic actions
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
                self.execute_tx(&mut tx).await.map_err(|e| {
                    CanisterError::HandleLogicError(format!("Error executing tx: {}", e))
                })?;
            }

            // Canister tx are executed here directly and tx status is updated to 'success' or 'fail' right away
            for mut tx in eligible_canister_txs {
                self.execute_tx(&mut tx).await.map_err(|e| {
                    CanisterError::HandleLogicError(format!("Error executing tx: {}", e))
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
}
