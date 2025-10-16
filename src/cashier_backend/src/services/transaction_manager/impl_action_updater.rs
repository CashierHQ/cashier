// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::constant::get_tx_timeout_nano_seconds;
use crate::repositories::Repositories;
use crate::services::transaction_manager::traits::{
    BatchExecutor, DependencyAnalyzer, TimeoutHandler,
};
use crate::{
    services::{
        link::service::LinkService,
        transaction_manager::{service::TransactionManagerService, traits::ActionUpdater},
    },
    utils::{self, helper::to_subaccount},
};
use candid::Principal;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::{
    dto::action::{ActionDto, Icrc112Requests},
    repository::{
        processing_transaction::ProcessingTransaction,
        transaction::v1::{Transaction, TransactionState},
    },
    service::{action::ActionData, tx_manager::UpdateActionArgs},
};
use cashier_common::runtime::IcEnvironment;
use icrc_ledger_types::icrc1::account::Account;
use log::info;

impl<E: 'static + IcEnvironment + Clone, R: 'static + Repositories> ActionUpdater<E>
    for TransactionManagerService<E, R>
{
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
    async fn update_action(
        &mut self,
        caller: Principal,
        args: UpdateActionArgs,
    ) -> Result<ActionDto, CanisterError> {
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
            if let Some(tx) = txs.iter_mut().find(|t| t.id == tx_id)
                && tx.state != new_state
                && let Err(e) = self.update_tx_state(tx, &new_state)
            {
                errors.push(e);
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
            owner: caller,
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
            let from_account = tx.get_from_account();

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
                    CanisterError::HandleLogicError(format!("Error spawning tx timeout task: {e}"))
                })?;

                self.update_tx_state(tx, &TransactionState::Processing)
                    .map_err(|e| {
                        CanisterError::HandleLogicError(format!("Error updating tx state: {e}"))
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
                    CanisterError::HandleLogicError(format!("Error spawning tx timeout task: {e}"))
                })?;

                self.update_tx_state(tx, &TransactionState::Processing)
                    .map_err(|e| {
                        CanisterError::HandleLogicError(format!("Error updating tx state: {e}"))
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
            .map_err(|e| CanisterError::InvalidDataError(format!("Error getting action: {e}")))?;

        let action_dto = ActionDto::build(&action_data, request);

        Ok(action_dto)
    }

    fn update_tx_state(
        &mut self,
        tx: &mut Transaction,
        state: &TransactionState,
    ) -> Result<(), CanisterError> {
        // update tx state
        info!("Updating transaction state: {} to {:?}", tx.id, state);
        self.transaction_service.update_tx_state(tx, state)?;
        // roll up
        let roll_up_resp = self.action_service.roll_up_state(&tx.id).map_err(|e| {
            CanisterError::HandleLogicError(format!("Failed to roll up state for action: {e}"))
        })?;

        // Pass the action state info to link_handle_tx_update
        LinkService::new(self.repo.clone(), self.ic_env.clone()).link_handle_tx_update(
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
        txs: &[Transaction],
    ) -> Result<Option<Icrc112Requests>, CanisterError> {
        let mut tx_execute_from_user_wallet = vec![];

        for tx in txs {
            let from_account = tx.get_from_account();
            // check from_account is caller or not
            if from_account == *caller {
                tx_execute_from_user_wallet.push(tx.clone());
            }
        }

        self.transaction_service
            .create_icrc_112(action_id, link_id, &tx_execute_from_user_wallet)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constant::ICP_CANISTER_PRINCIPAL;
    use crate::repositories::tests::TestRepositories;
    use crate::services::transaction_manager::test_fixtures::*;
    use crate::utils::test_utils::{
        random_id_string, random_principal_id, runtime::MockIcEnvironment,
    };
    use candid::{Nat, Principal};
    use cashier_backend_types::repository::{
        common::{Asset, Wallet},
        transaction::v1::{FromCallType, IcTransaction, Icrc1Transfer, Protocol},
    };
    use std::rc::Rc;

    #[test]
    fn it_should_error_update_tx_state_if_tx_not_found() {
        // Arrange
        let mut service: TransactionManagerService<MockIcEnvironment, TestRepositories> =
            TransactionManagerService::new(
                Rc::new(TestRepositories::new()),
                MockIcEnvironment::new(),
            );

        let mut dummy_tx = Transaction {
            id: random_id_string(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 0u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from(1000u64),
                ts: None,
                memo: None,
            })),
            start_ts: None,
        };
        let new_state = TransactionState::Processing;

        // Act
        let result = service.update_tx_state(&mut dummy_tx, &new_state);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("get_action_by_tx_id failed"));
        } else {
            panic!("Expected NotFound error, got {:?}", result);
        }
    }

    #[test]
    fn it_should_update_tx_state() {
        // Arrange
        let mut service: TransactionManagerService<MockIcEnvironment, TestRepositories> =
            TransactionManagerService::new(
                Rc::new(TestRepositories::new()),
                MockIcEnvironment::new(),
            );
        let link_id = random_id_string();
        let action = create_action_with_intents_fixture(&mut service, link_id);
        assert!(!action.intents.is_empty());
        assert_eq!(action.intents[0].transactions.len(), 1);
        let tx_id1 = &action.intents[0].transactions[0].id;
        assert_eq!(
            action.intents[0].transactions[0].state,
            TransactionState::Created
        );

        let mut tx = Transaction {
            id: tx_id1.clone(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 0u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from(1000u64),
                ts: None,
                memo: None,
            })),
            start_ts: None,
        };

        // Act
        let result = service.update_tx_state(&mut tx, &TransactionState::Success);

        // Assert
        assert!(result.is_ok());
        let updated_tx = service.transaction_service.get_tx_by_id(&tx.id).unwrap();
        assert_eq!(updated_tx.id, tx.id);
        assert_eq!(updated_tx.state, TransactionState::Success);
    }

    #[test]
    fn it_should_return_none_create_icrc112_request_if_caller_is_not_from_account() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment, TestRepositories> =
            TransactionManagerService::new(
                Rc::new(TestRepositories::new()),
                MockIcEnvironment::new(),
            );
        let action_id = random_id_string();
        let link_id = random_id_string();
        let tx_id = random_id_string();
        let from_principal_id = random_principal_id();

        let tx = Transaction {
            id: tx_id,
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 0u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::new(from_principal_id),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from(1000u64),
                ts: None,
                memo: None,
            })),
            start_ts: None,
        };

        let caller = Account {
            owner: Principal::anonymous(),
            subaccount: None,
        };

        // Act
        let result = service
            .create_icrc_112(&caller, &action_id, &link_id, &[tx])
            .unwrap();

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_create_icrc112() {
        // Arrange
        let mut service: TransactionManagerService<MockIcEnvironment, TestRepositories> =
            TransactionManagerService::new(
                Rc::new(TestRepositories::new()),
                MockIcEnvironment::new(),
            );
        let link_id = random_id_string();
        let action = create_action_with_intents_fixture(&mut service, link_id.clone());
        assert!(!action.intents.is_empty());
        assert_eq!(action.intents[0].transactions.len(), 1);
        let tx_id1 = &action.intents[0].transactions[0].id;
        let creator_id = action.creator;

        let tx1 = Transaction {
            id: tx_id1.clone(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 0u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::new(creator_id),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: ICP_CANISTER_PRINCIPAL,
                },
                amount: Nat::from(1000u64),
                ts: None,
                memo: None,
            })),
            start_ts: None,
        };

        let caller = Account {
            owner: creator_id,
            subaccount: None,
        };

        // Act
        let result = service
            .create_icrc_112(&caller, &action.id, &link_id, &[tx1])
            .unwrap();

        // Assert
        assert!(result.is_some());
        let icrc112_requests = result.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
    }
}
