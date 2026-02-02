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
        let is_success = true;

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
        for tx in transactions.iter_mut() {
            if tx.is_icrc2_approve()
                && tx.from_call_type == FromCallType::Wallet
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
    use crate::utils::test_utils::{generate_mock_intent, generate_mock_transaction};
    use cashier_backend_types::repository::action::v1::{Action, ActionState, ActionType};
    use cashier_backend_types::repository::intent::v1::IntentState;
    use cashier_backend_types::repository::transaction::v1::{
        FromCallType, Transaction, TransactionState,
    };
    use std::cell::RefCell;
    use std::collections::HashMap;
    use std::future::Future;
    use std::pin::Pin;

    // Mock TransactionValidator
    #[derive(Clone)]
    struct MockValidator {
        should_fail: RefCell<bool>,
    }

    impl MockValidator {
        fn new(should_fail: bool) -> Self {
            Self {
                should_fail: RefCell::new(should_fail),
            }
        }
    }

    impl TransactionValidator for MockValidator {
        fn validate_success(
            &self,
            _tx: Transaction,
        ) -> Pin<Box<dyn Future<Output = Result<(), String>>>> {
            let fail = *self.should_fail.borrow();
            Box::pin(async move {
                if fail {
                    Err("mock fail".to_string())
                } else {
                    Ok(())
                }
            })
        }
    }

    fn make_action(state: ActionState) -> Action {
        Action {
            id: "action1".to_string(),
            state,
            r#type: ActionType::CreateLink,
            creator: candid::Principal::anonymous(),
            link_id: "mock_link_id".to_string(),
        }
    }

    #[tokio::test]
    async fn test_validate_action_transactions_success() {
        // Arrange
        let validator = MockValidator::new(false);
        let service = ValidatorService::new(validator.clone());
        let mut tx1 = generate_mock_transaction("tx1", vec![]);
        tx1.from_call_type = FromCallType::Wallet;
        let mut tx2 = generate_mock_transaction("tx2", vec![]);
        tx2.from_call_type = FromCallType::Canister;
        let txs = vec![tx1.clone(), tx2.clone()];

        // Act
        let result = service.validate_action_transactions(&txs).await.unwrap();

        // Assert
        let tx1_result = result
            .wallet_transactions
            .iter()
            .find(|tx| tx.id == "tx1")
            .unwrap();
        assert_eq!(tx1_result.state, TransactionState::Success);
        let tx2_result = result
            .canister_transactions
            .iter()
            .find(|tx| tx.id == "tx2")
            .unwrap();
        assert_eq!(tx2_result.state, TransactionState::Created);
        assert!(result.is_success);
        assert!(result.errors.is_empty());
    }

    #[tokio::test]
    async fn test_validate_action_transactions_fail() {
        // Arrange
        let validator_fail = MockValidator::new(true);
        let service_fail = ValidatorService::new(validator_fail);
        let mut tx1 = generate_mock_transaction("tx1", vec![]);
        tx1.from_call_type = FromCallType::Wallet;

        // Act
        let result_fail = service_fail
            .validate_action_transactions(&[tx1.clone()])
            .await
            .unwrap();

        // Assert
        let tx1_fail = result_fail
            .wallet_transactions
            .iter()
            .find(|tx| tx.id == "tx1")
            .unwrap();
        assert_eq!(tx1_fail.state, TransactionState::Fail);
        assert!(!result_fail.is_success);
        assert_eq!(result_fail.errors, vec!["mock fail".to_string()]);
    }

    #[test]
    fn test_rollup_action_state_success() {
        // Arrange
        let validator = MockValidator::new(false);
        let service = ValidatorService::new(validator);
        let action = make_action(ActionState::Created);
        let mut intent1 = generate_mock_intent("intent1", vec![]);
        intent1.state = IntentState::Created;
        let mut intent2 = generate_mock_intent("intent2", vec![]);
        intent2.state = IntentState::Created;
        let mut intent_txs_map = HashMap::new();
        let mut tx_success = generate_mock_transaction("tx1", vec![]);
        tx_success.from_call_type = FromCallType::Wallet;
        tx_success.state = TransactionState::Success;
        intent_txs_map.insert("intent1".to_string(), vec![tx_success.clone()]);
        intent_txs_map.insert("intent2".to_string(), vec![tx_success]);

        // Act
        let result = service
            .rollup_action_state(action, &[intent1, intent2], intent_txs_map.clone())
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Success);
        for intent in result.intents.iter() {
            assert_eq!(intent.state, IntentState::Success);
        }
    }

    #[test]
    fn test_rollup_action_state_fail() {
        // Arrange
        let validator = MockValidator::new(false);
        let service = ValidatorService::new(validator);
        let action = make_action(ActionState::Created);
        let mut intent1 = generate_mock_intent("intent1", vec![]);
        intent1.state = IntentState::Created;
        let mut intent2 = generate_mock_intent("intent2", vec![]);
        intent2.state = IntentState::Created;
        let mut intent_txs_map = HashMap::new();
        let mut tx_success = generate_mock_transaction("tx1", vec![]);
        tx_success.from_call_type = FromCallType::Wallet;
        tx_success.state = TransactionState::Success;
        let mut tx_fail = generate_mock_transaction("tx2", vec![]);
        tx_fail.from_call_type = FromCallType::Wallet;
        tx_fail.state = TransactionState::Fail;
        intent_txs_map.insert("intent1".to_string(), vec![tx_success.clone()]);
        intent_txs_map.insert("intent2".to_string(), vec![tx_success]);

        // Act
        let mut intent_txs_map_fail = intent_txs_map.clone();
        intent_txs_map_fail.insert("intent2".to_string(), vec![tx_fail]);
        let result_fail = service
            .rollup_action_state(action, &[intent1, intent2], intent_txs_map_fail)
            .unwrap();

        // Assert
        assert_eq!(result_fail.action.state, ActionState::Fail);
        let intent2_result = result_fail
            .intents
            .iter()
            .find(|i| i.id == "intent2")
            .unwrap();
        assert_eq!(intent2_result.state, IntentState::Fail);
    }
}
