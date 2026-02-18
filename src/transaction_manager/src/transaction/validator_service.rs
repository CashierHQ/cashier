// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    transaction::traits::TransactionValidator, utils::topological_sort::kahn_topological_sort,
};
use cashier_backend_types::{
    error::CanisterError,
    link_v2::{
        graph::Graph,
        transaction_manager::{RollupActionStateResult, ValidateActionTransactionsResult},
    },
    repository::{
        action::v1::{Action, ActionState},
        intent::v1::{Intent, IntentState},
        transaction::v1::{FromCallType, Transaction, TransactionState},
    },
};
use log::info;
use std::collections::HashMap;

pub struct ValidatorService<V: TransactionValidator + Clone> {
    validator: V,
}

impl<V: TransactionValidator + Clone> ValidatorService<V> {
    pub fn new(validator: V) -> Self {
        Self { validator }
    }

    /// Validate a list of transactions and update their states accordingly
    /// # Arguments
    /// * `transactions` - A slice of transactions to be validated
    /// # Returns
    /// * `Result<ValidateActionTransactionsResult, CanisterError>` - The result of validating the transactions
    pub async fn validate_action_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<ValidateActionTransactionsResult, CanisterError> {
        let mut errors = Vec::<String>::new();
        let mut is_success = true;
        let validator = self.validator.clone();

        let txs_map: HashMap<&str, &Transaction> =
            transactions.iter().map(|tx| (tx.id.as_str(), tx)).collect();

        // split canister and wallet transactions
        let (canister_transactions, mut wallet_transactions): (Vec<Transaction>, Vec<Transaction>) =
            transactions
                .iter()
                .cloned()
                .partition(|tx| tx.from_call_type == FromCallType::Canister);

        // verify ICRC1 wallet transactions in topological order and update their status
        // the ICRC2 wallet transactions verification is skipped because they are verified during execution
        let icrc1_wallet_transactions = wallet_transactions
            .iter()
            .filter(|tx| tx.is_icrc1())
            .cloned()
            .collect::<Vec<_>>();

        let graph: Graph = icrc1_wallet_transactions.into();
        let sorted_levels = kahn_topological_sort(&graph)?;

        for level_txids in sorted_levels.iter() {
            // validate all transactions in the same level in parallel
            let level_txs = level_txids
                .iter()
                .map(|txid| {
                    txs_map.get(txid.as_str()).cloned().ok_or_else(|| {
                        CanisterError::HandleLogicError(format!(
                            "Transaction with id {} not found",
                            txid
                        ))
                    })
                })
                .collect::<Result<Vec<_>, _>>()?;

            let futures = level_txs
                .iter()
                .map(|&tx| validator.validate_success(tx.clone()))
                .collect::<Vec<_>>();
            let results = futures::future::join_all(futures).await;

            for (txid, result) in level_txids.iter().zip(results.into_iter()) {
                let mut updated_tx = txs_map
                    .get(txid.as_str())
                    .cloned()
                    .ok_or_else(|| {
                        CanisterError::HandleLogicError(format!(
                            "Transaction with id {} not found",
                            txid
                        ))
                    })?
                    .clone();
                match result {
                    Ok(_) => {
                        updated_tx.state = TransactionState::Success;
                    }
                    Err(e) => {
                        updated_tx.state = TransactionState::Fail;
                        is_success = false;
                        errors.push(format!("Failed to validate transaction {}: {}", txid, e));
                    }
                }
                // update in wallet transactions
                if let Some(pos) = wallet_transactions
                    .iter()
                    .position(|wtx| wtx.id == updated_tx.id)
                {
                    wallet_transactions[pos] = updated_tx;
                }
            }
        }

        Ok(ValidateActionTransactionsResult {
            wallet_transactions,
            canister_transactions,
            is_success,
            errors,
        })
    }

    /// Rollup the state of ICRC-2 wallet transactions based on their dependent transactions
    /// # Arguments
    /// * `transactions` - A mutable slice of transactions to be rolled up
    pub fn rollup_icrc2_wallet_transaction_state(&self, transactions: &mut [Transaction]) {
        info!("[rollup_icrc2_wallet_transaction_state] {:?}", transactions);
        // Build dependent_map with immutable borrows
        let mut dependent_map: HashMap<String, Vec<TransactionState>> = HashMap::new();

        for tx in transactions.iter() {
            if let Some(deps) = &tx.dependency {
                for dep in deps.iter() {
                    dependent_map
                        .entry(dep.clone())
                        .or_default()
                        .push(tx.state.clone());
                }
            }
        }

        // Now mutably iterate and update
        // Skip Success transactions to preserve validated state on retry
        for tx in transactions.iter_mut() {
            if tx.is_icrc2_approve()
                && tx.from_call_type == FromCallType::Wallet
                && tx.state != TransactionState::Success
                && let Some(dependent_states) = dependent_map.get(&tx.id)
            {
                if dependent_states.contains(&TransactionState::Fail) {
                    tx.state = TransactionState::Fail;
                } else if dependent_states
                    .iter()
                    .all(|state| *state == TransactionState::Success)
                {
                    tx.state = TransactionState::Success;
                }
            }
        }
    }

    /// Rollup the state of an action based on its intents and their transactions
    /// # Arguments
    /// * `action` - The action whose state is to be rolled up
    /// * `intents` - A slice of intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// # Returns
    /// * `Result<RollupActionStateResult, CanisterError>` - The result of rolling up the action state
    pub fn rollup_action_state(
        &self,
        action: Action,
        intents: &[Intent],
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<RollupActionStateResult, CanisterError> {
        // rollup intent state from its transactions state
        let mut updated_intents = Vec::<Intent>::new();
        for intent in intents.iter() {
            let mut updated_intent = intent.clone();
            if let Some(txs) = intent_txs_map.get(&intent.id) {
                let all_success = txs.iter().all(|tx| tx.state == TransactionState::Success);
                let any_fail = txs.iter().any(|tx| tx.state == TransactionState::Fail);

                if all_success {
                    updated_intent.state = IntentState::Success;
                } else if any_fail {
                    updated_intent.state = IntentState::Fail;
                }
            }
            updated_intents.push(updated_intent);
        }

        // rollup action state from its intents state
        let mut updated_action = action;
        let all_intent_success = updated_intents
            .iter()
            .all(|intent| intent.state == IntentState::Success);
        let any_intent_fail = updated_intents
            .iter()
            .any(|intent| intent.state == IntentState::Fail);

        if all_intent_success {
            updated_action.state = ActionState::Success;
        } else if any_intent_fail {
            updated_action.state = ActionState::Fail;
        }

        Ok(RollupActionStateResult {
            action: updated_action,
            intents: updated_intents,
            intent_txs_map,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::{
        generate_mock_create_action, generate_mock_icrc1_wallet_to_link_transactions,
        generate_mock_icrc2_wallet_to_link_transactions,
        generate_mock_wallet_to_treasury_transactions,
    };
    use candid::Nat;
    use cashier_backend_types::repository::action::v1::ActionState;
    use cashier_backend_types::repository::common::Asset;
    use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask};
    use cashier_backend_types::repository::transaction::v1::{Transaction, TransactionState};
    use cashier_common::test_utils::random_principal_id;
    use std::collections::HashMap;
    use std::future::Future;
    use std::pin::Pin;

    // Mock TransactionValidator
    #[derive(Clone)]
    struct MockValidator {
        should_fail: HashMap<String, bool>,
    }

    impl MockValidator {
        fn new() -> Self {
            Self {
                should_fail: HashMap::new(),
            }
        }

        fn set_failure(&mut self, tx_id: &str, fail: bool) {
            self.should_fail.insert(tx_id.to_string(), fail);
        }

        fn is_fail(&self, tx_id: &str) -> bool {
            *self.should_fail.get(tx_id).unwrap_or(&false)
        }
    }

    impl TransactionValidator for MockValidator {
        fn validate_success(
            &self,
            tx: Transaction,
        ) -> Pin<Box<dyn Future<Output = Result<(), String>>>> {
            let fail = self.is_fail(&tx.id);
            Box::pin(async move {
                if fail {
                    Err("mock fail".to_string())
                } else {
                    Ok(())
                }
            })
        }
    }

    #[tokio::test]
    async fn it_should_validate_icrc2_create_action_transaction_success() {
        // Arrange
        let mut mock_validator = MockValidator::new();

        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let asset: Asset = Asset::default();
        let amount = Nat::from(1000u64);
        let asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );
        let all_txs: Vec<Transaction> = [fee_txs.clone(), asset_txs.clone()].concat();
        mock_validator.set_failure(&fee_txs[0].id, true);
        mock_validator.set_failure(&asset_txs[0].id, true);
        let service = ValidatorService::new(mock_validator);

        // Act
        let result = service
            .validate_action_transactions(&all_txs)
            .await
            .unwrap();

        // Assert
        assert!(result.is_success);
        assert!(result.errors.is_empty());
        assert_eq!(result.wallet_transactions.len(), 2);
        assert_eq!(result.canister_transactions.len(), 2);
    }

    #[tokio::test]
    async fn it_should_validate_icrc1_create_action_transaction_failed() {
        // Arrange
        let mut mock_validator = MockValidator::new();
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset: Asset = Asset::default();
        let amount = Nat::from(1000u64);
        let fee_tx = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let asset_txs = generate_mock_icrc1_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );

        let all_txs: Vec<Transaction> = [fee_tx.clone(), asset_txs.clone()].concat();

        mock_validator.set_failure(&fee_tx[0].id, true);
        mock_validator.set_failure(&asset_txs[0].id, true);
        let service = ValidatorService::new(mock_validator);

        // Act
        let result = service
            .validate_action_transactions(&all_txs)
            .await
            .unwrap();

        // Assert
        assert!(!result.is_success);
        assert_eq!(result.errors.len(), 1);
        assert_eq!(result.wallet_transactions.len(), 2);
        assert_eq!(result.canister_transactions.len(), 1);

        let fail_tx = result
            .wallet_transactions
            .iter()
            .find(|tx| tx.id == asset_txs[0].id)
            .unwrap();
        assert_eq!(fail_tx.state, TransactionState::Fail);
    }

    #[tokio::test]
    async fn it_should_rollup_icrc2_wallet_transaction_state_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);
        let mut fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let mut asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );
        fee_txs[1].state = TransactionState::Success; // Simulate fee transfer success
        asset_txs[1].state = TransactionState::Success; // Simulate asset transfer

        let mut all_txs: Vec<Transaction> = [fee_txs.clone(), asset_txs.clone()].concat();
        let service = ValidatorService::new(MockValidator::new());

        // Assert initial states
        assert_eq!(all_txs[0].state, TransactionState::Created);
        assert_eq!(all_txs[2].state, TransactionState::Created);

        // Act
        service.rollup_icrc2_wallet_transaction_state(&mut all_txs);

        // Assert after rollup
        assert_eq!(all_txs[0].state, TransactionState::Success); // Approve should change to Success
        assert_eq!(all_txs[1].state, TransactionState::Success); // Transfer should succeed
        assert_eq!(all_txs[2].state, TransactionState::Success); // Approve should change to Success
        assert_eq!(all_txs[3].state, TransactionState::Success); // Transfer should succeed
    }

    #[tokio::test]
    async fn it_should_rollup_icrc2_wallet_transaction_state_failed() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);
        let mut fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let mut asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );
        fee_txs[1].state = TransactionState::Fail; // Simulate fee transfer failure
        asset_txs[1].state = TransactionState::Fail; // Simulate asset transfer failure

        let mut all_txs: Vec<Transaction> = [fee_txs.clone(), asset_txs.clone()].concat();
        let service = ValidatorService::new(MockValidator::new());

        // Assert initial states
        assert_eq!(all_txs[0].state, TransactionState::Created);
        assert_eq!(all_txs[2].state, TransactionState::Created);

        // Act
        service.rollup_icrc2_wallet_transaction_state(&mut all_txs);

        // Assert after rollup
        assert_eq!(all_txs[0].state, TransactionState::Fail);
        assert_eq!(all_txs[1].state, TransactionState::Fail);
        assert_eq!(all_txs[2].state, TransactionState::Fail);
        assert_eq!(all_txs[3].state, TransactionState::Fail);
    }

    #[tokio::test]
    async fn it_should_rollup_action_failed_fee_intent_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let (action, intents, mut intent_txs_map) =
            generate_mock_create_action(from, link_account, cashier_be, treasury, asset, amount);

        let fee_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap()
            .id
            .as_str();
        let fee_txs = intent_txs_map.get_mut(fee_intent_id).unwrap();
        for tx in fee_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let asset_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap()
            .id
            .as_str();
        let asset_txs = intent_txs_map.get_mut(asset_intent_id).unwrap();
        for tx in asset_txs.iter_mut() {
            tx.state = TransactionState::Fail;
        }

        let mock_validator = MockValidator::new();
        let service = ValidatorService::new(mock_validator);

        // Act
        let result = service
            .rollup_action_state(action, &intents, intent_txs_map.clone())
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Fail);
        assert_eq!(result.intents.len(), 2);
        let fee_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap();
        assert_eq!(fee_intent.state, IntentState::Success);
        let asset_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap();
        assert_eq!(asset_intent.state, IntentState::Fail);
    }

    #[tokio::test]
    async fn it_should_rollup_action_failed_asset_intent_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let (action, intents, mut intent_txs_map) =
            generate_mock_create_action(from, link_account, cashier_be, treasury, asset, amount);

        let fee_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap()
            .id
            .as_str();
        let fee_txs = intent_txs_map.get_mut(fee_intent_id).unwrap();
        for tx in fee_txs.iter_mut() {
            tx.state = TransactionState::Fail;
        }

        let asset_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap()
            .id
            .as_str();
        let asset_txs = intent_txs_map.get_mut(asset_intent_id).unwrap();
        for tx in asset_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let mock_validator = MockValidator::new();
        let service = ValidatorService::new(mock_validator);

        // Act
        let result = service
            .rollup_action_state(action, &intents, intent_txs_map.clone())
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Fail);
        assert_eq!(result.intents.len(), 2);
        let fee_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap();
        assert_eq!(fee_intent.state, IntentState::Fail);
        let asset_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap();
        assert_eq!(asset_intent.state, IntentState::Success);
    }

    #[tokio::test]
    async fn it_should_rollup_action_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let (action, intents, mut intent_txs_map) =
            generate_mock_create_action(from, link_account, cashier_be, treasury, asset, amount);

        let fee_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap()
            .id
            .as_str();
        let fee_txs = intent_txs_map.get_mut(fee_intent_id).unwrap();
        for tx in fee_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let asset_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap()
            .id
            .as_str();
        let asset_txs = intent_txs_map.get_mut(asset_intent_id).unwrap();
        for tx in asset_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let mock_validator = MockValidator::new();
        let service = ValidatorService::new(mock_validator);

        // Act
        let result = service
            .rollup_action_state(action, &intents, intent_txs_map.clone())
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Success);
        assert_eq!(result.intents.len(), 2);
        let fee_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap();
        assert_eq!(fee_intent.state, IntentState::Success);
        let asset_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap();
        assert_eq!(asset_intent.state, IntentState::Success);
    }
}
