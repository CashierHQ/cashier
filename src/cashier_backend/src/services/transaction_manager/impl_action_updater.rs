// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::constant::get_tx_timeout_nano_seconds;
use crate::services::transaction_manager::traits::BatchExecutor;
use crate::services::transaction_manager::traits::DependencyAnalyzer;
use crate::services::transaction_manager::traits::TimeoutHandler;
use async_trait::async_trait;
use cashier_types::processing_transaction::ProcessingTransaction;
use cashier_types::transaction::v2::{Transaction, TransactionState};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    core::action::types::ActionDto,
    info,
    services::{
        link::service::LinkService,
        transaction_manager::{service::TransactionManagerService, traits::ActionUpdater},
    },
    types::{
        error::CanisterError,
        icrc_112_transaction::Icrc112Requests,
        transaction_manager::{ActionData, UpdateActionArgs},
    },
    utils::{self, helper::to_subaccount, runtime::IcEnvironment},
};

#[async_trait(?Send)]
impl<E: IcEnvironment + Clone> ActionUpdater<E> for TransactionManagerService<E> {
    /// Updates an action with new state information and executes eligible transactions
    ///
    /// This method:
    /// 1. Fetches the current action data by ID
    /// 2. Manually checks and updates the status of all transactions in the action
    /// 3. Identifies eligible transactions (those with all dependencies resolved)
    /// 4. Creates ICRC-112 requests for wallet transactions if execute_wallet_tx is false
    /// 5. Executes wallet transactions (setting them to 'processing' state)
    /// 6. Executes canister transactions immediately
    /// 7. Updates action state and executes the callback with state information
    ///
    /// The callback function is executed asynchronously after the action update is complete.
    ///
    /// # Arguments
    /// * `args` - UpdateActionArgs containing action_id, link_id, and execute_wallet_tx flag
    ///
    /// # Returns
    /// * `Result<ActionDto, CanisterError>` - The updated action data or an error
    async fn update_action(&self, args: UpdateActionArgs) -> Result<ActionDto, CanisterError> {
        let action_data = self
            .action_service
            .get_action_data(&args.action_id)
            .map_err(CanisterError::NotFound)?;

        let mut txs = utils::collections::flatten_hashmap_values(&action_data.intent_txs);

        // manually check the status of the tx of the action
        // update status to whaterver is returned by the manual check
        let check_results = self
            .manual_check_status_batch(txs.clone(), txs.clone())
            .await;
        let mut errors = vec![];

        for (tx_id, new_state) in check_results {
            if let Some(tx) = txs.iter_mut().find(|t| t.id == tx_id) {
                if tx.state != new_state {
                    if let Err(e) = self.update_tx_state(tx, &new_state) {
                        errors.push(e);
                    }
                }
            }
        }

        if !errors.is_empty() {
            return Err(CanisterError::BatchError(errors));
        }

        let mut request = None;

        // check which tx are eligible to be executed
        // if tx has dependent txs, that need to be completed before executing it, it is not eligible
        // if all the dependent txs were complete, it is eligible to be executed
        // There are additional conditions (handled in has_dependency method below):
        // - if tx is grouped into a batch ICRC-112, dependency between txs in the batch is ignored during eligibility check
        // - if tx is gropued into a batch ICRC-112, tx is only eligible if all other tx in batch have no dependencies (so that al txs can be executed in batch together)
        // - if execute_wallet_tx = fase, all tx grouped into a batach ICRC-112 are not eligible. client calls update_action with this arg to relay ICRC-112 reponse to tx manager, so we don't want to execute wallet tx again.
        let all_txs = match self.action_service.get_action_data(&args.action_id) {
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
            subaccount: Some(to_subaccount(&args.link_id)?),
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
            let has_dependency = match self.has_dependency(&tx.id) {
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

            request =
                icrc_112_requests.and_then(|req| if req.is_empty() { None } else { Some(req) });

            // We execute transactions

            // Wallet tx are executed by the client, when it receives the ICRC-112 request this method returns
            // and tx status is 'processing' until client updates tx manager with response of ICRC-112
            for tx in eligible_wallet_txs.iter_mut() {
                self.spawn_tx_timeout_task(tx.id.clone()).map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "Error spawning tx timeout task: {}",
                        e
                    ))
                })?;

                self.update_tx_state(tx, &TransactionState::Processing)
                    .map_err(|e| {
                        CanisterError::HandleLogicError(format!("Error updating tx state: {}", e))
                    })?;

                let processing_tx =
                    ProcessingTransaction::from_tx_with_timeout(tx, get_tx_timeout_nano_seconds());

                self.processing_transaction_repository
                    .create(tx.id.clone(), processing_tx);
            }

            // Canister tx are executed here directly and tx status is updated to 'success' or 'fail' right away
            // First loop: update the transactions to processing state
            for tx in eligible_canister_txs.iter_mut() {
                self.spawn_tx_timeout_task(tx.id.clone()).map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "Error spawning tx timeout task: {}",
                        e
                    ))
                })?;

                self.update_tx_state(tx, &TransactionState::Processing)
                    .map_err(|e| {
                        CanisterError::HandleLogicError(format!("Error updating tx state: {}", e))
                    })?;

                let processing_tx =
                    ProcessingTransaction::from_tx_with_timeout(tx, get_tx_timeout_nano_seconds());

                self.processing_transaction_repository
                    .create(tx.id.clone(), processing_tx);
            }

            // Second loop: execute the transactions
            self.execute_canister_txs_batch(&mut eligible_canister_txs)
                .await?;
        }

        let action_data: ActionData = self
            .action_service
            .get_action_data(&args.action_id)
            .map_err(|e| CanisterError::InvalidDataError(format!("Error getting action: {}", e)))?;

        let action_dto = ActionDto::build(&action_data, request);

        Ok(action_dto)
    }

    fn update_tx_state(
        &self,
        tx: &mut Transaction,
        state: &TransactionState,
    ) -> Result<(), CanisterError> {
        // update tx state
        info!("Updating transaction state: {} to {:?}", tx.id, state);
        self.transaction_service.update_tx_state(tx, state)?;
        // roll up
        let roll_up_resp = self.action_service.roll_up_state(&tx.id).map_err(|e| {
            CanisterError::HandleLogicError(format!("Failed to roll up state for action: {}", e))
        })?;

        // Pass the action state info to link_handle_tx_update
        LinkService::<E>::get_instance().link_handle_tx_update(
            &roll_up_resp.previous_state,
            &roll_up_resp.current_state,
            &roll_up_resp.link_id,
            &roll_up_resp.action_type,
            &roll_up_resp.action_id,
        )?;

        Ok(())
    }

    fn create_icrc_112(
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

        self.transaction_service
            .create_icrc_112(action_id, link_id, &tx_execute_from_user_wallet)
    }
}
