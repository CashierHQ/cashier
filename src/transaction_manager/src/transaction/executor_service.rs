// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::transaction::v1::{FromCallType, Transaction, TransactionState},
    transaction_manager::{ExecuteTransactionsResult, Graph},
};
use std::collections::HashMap;

use crate::{
    transaction::traits::{ExecutionService, TransactionExecutor},
    utils::topological_sort::kahn_topological_sort,
};

pub struct IcExecutorService<E: TransactionExecutor + Clone> {
    executor: E,
}

impl<E: TransactionExecutor + Clone> IcExecutorService<E> {
    pub fn new(executor: E) -> Self {
        Self { executor }
    }
}

impl<E: TransactionExecutor + Clone> ExecutionService for IcExecutorService<E> {
    /// Executes a list of transactions using the underlying executor.
    /// # Arguments
    /// * `transactions` - A slice of transactions to be executed
    /// # Returns
    /// * `Result<ExecuteTransactionsResult, CanisterError>` - The result of executing the transactions
    fn execute_transactions<'a>(
        &'a self,
        transactions: &'a [Transaction],
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<Output = Result<ExecuteTransactionsResult, CanisterError>> + 'a,
        >,
    > {
        Box::pin(async move {
            let mut executed_transactions = Vec::<Transaction>::new();
            let mut errors = Vec::<String>::new();
            let mut is_success = true;
            let executor = self.executor.clone();

            let txs_map: HashMap<&str, &Transaction> =
                transactions.iter().map(|tx| (tx.id.as_str(), tx)).collect();

            // Execute transactions in topological order
            // all transactions in the same level are executed in parallel
            let graph: Graph = transactions.to_vec().into();
            let sorted_levels = kahn_topological_sort(&graph)?;

            for level_txids in sorted_levels.iter() {
                let level_txs = level_txids
                    .iter()
                    .map(|txid| {
                        txs_map.get(txid.as_str()).cloned().ok_or_else(|| {
                            CanisterError::HandleLogicError(format!(
                                "Transaction with id {} not found in transactions map",
                                txid
                            ))
                        })
                    })
                    .collect::<Result<Vec<_>, _>>()?;

                // filter only Canister call type transactions for execution
                // skip Success transactions to avoid re-execution on retry
                let level_txs = level_txs
                    .iter()
                    .filter(|tx| {
                        tx.from_call_type == FromCallType::Canister
                            && tx.state != TransactionState::Success
                    })
                    .cloned()
                    .collect::<Vec<_>>();

                if level_txs.is_empty() {
                    continue;
                }

                let futures = level_txs
                    .iter()
                    .map(|&tx| executor.execute(tx.clone()))
                    .collect::<Vec<_>>();
                let results = futures::future::join_all(futures).await;

                for (&tx, result) in level_txs.iter().zip(results) {
                    match result {
                        Ok(_) => {
                            executed_transactions.push(Transaction {
                                state: TransactionState::Success,
                                ..tx.clone()
                            });
                        }
                        Err(e) => {
                            let mut failed_tx = tx.clone();
                            failed_tx.state = TransactionState::Fail;
                            executed_transactions.push(failed_tx);
                            errors.push(format!("Failed to execute transaction {}: {}", tx.id, e));
                            is_success = false;
                        }
                    }
                }

                // If any transaction in the level failed, stop executing further levels
                if !is_success {
                    break;
                }
            }

            Ok(ExecuteTransactionsResult {
                transactions: executed_transactions,
                is_success,
                errors,
            })
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::{
        generate_mock_icrc2_wallet_to_link_transactions,
        generate_mock_wallet_to_treasury_transactions,
    };
    use candid::Nat;
    use cashier_backend_types::repository::asset::v1::Asset;
    use cashier_common::test_utils::random_principal_id;
    use std::pin::Pin;

    #[derive(Clone)]
    struct MockTransactionExecutor {
        should_fail: HashMap<String, bool>,
    }

    impl MockTransactionExecutor {
        fn new() -> Self {
            Self {
                should_fail: HashMap::new(),
            }
        }

        fn set_failure(&mut self, tx_id: &str, should_fail: bool) {
            self.should_fail.insert(tx_id.to_string(), should_fail);
        }

        fn is_failure(&self, tx_id: &str) -> bool {
            *self.should_fail.get(tx_id).unwrap_or(&false)
        }
    }

    impl TransactionExecutor for MockTransactionExecutor {
        fn execute(
            &self,
            transaction: Transaction,
        ) -> Pin<Box<dyn std::future::Future<Output = Result<(), CanisterError>>>> {
            let tx_id = transaction.id.clone();
            let should_fail = self.is_failure(&tx_id);
            Box::pin(async move {
                if should_fail {
                    Err(CanisterError::HandleLogicError(format!(
                        "Execution failed for transaction {}",
                        tx_id
                    )))
                } else {
                    Ok(())
                }
            })
        }
    }

    #[tokio::test]
    async fn it_should_execute_transaction_failed() {
        // Arrange
        let from = random_principal_id();
        let link_account = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );
        let all_txs = [fee_txs.clone(), asset_txs.clone()].concat();
        let mut mock_executor = MockTransactionExecutor::new();
        mock_executor.set_failure(&fee_txs[1].id, true);
        mock_executor.set_failure(&asset_txs[1].id, true);
        let service = IcExecutorService::new(mock_executor);

        // Act
        let result = service.execute_transactions(&all_txs).await;

        // Assert
        assert!(result.is_ok());
        let exec_result = result.unwrap();
        assert!(!exec_result.is_success);
        assert_eq!(exec_result.errors.len(), 2);
        assert_eq!(exec_result.transactions.len(), 2);
        let fee_tx = exec_result
            .transactions
            .iter()
            .find(|tx| tx.id == fee_txs[1].id)
            .unwrap();
        assert_eq!(fee_tx.state, TransactionState::Fail);
        let asset_tx = exec_result
            .transactions
            .iter()
            .find(|tx| tx.id == asset_txs[1].id)
            .unwrap();
        assert_eq!(asset_tx.state, TransactionState::Fail);
    }

    #[tokio::test]
    async fn it_should_execute_transaction_success() {
        // Arrange
        let from = random_principal_id();
        let link_account = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );

        let all_txs = [fee_txs.clone(), asset_txs.clone()].concat();
        let mock_executor = MockTransactionExecutor::new();
        let service = IcExecutorService::new(mock_executor);

        // Act
        let result = service.execute_transactions(&all_txs).await;

        // Assert
        assert!(result.is_ok());
        let exec_result = result.unwrap();
        assert!(exec_result.is_success);
        assert_eq!(exec_result.errors.len(), 0);
        assert_eq!(exec_result.transactions.len(), 2);
        for tx in exec_result.transactions.iter() {
            assert_eq!(tx.state, TransactionState::Success);
        }
    }

    #[tokio::test]
    async fn it_should_stop_execution_further_if_execution_failed_in_level() {
        // Arrange
        let from = random_principal_id();
        let link_account = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let asset = Asset::IC {
            address: random_principal_id(),
        };
        let amount = Nat::from(1000u64);

        let mut fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let mut asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );

        // Set all transactions to Canister call type to be executed
        for tx in fee_txs.iter_mut() {
            tx.from_call_type = FromCallType::Canister;
        }
        for tx in asset_txs.iter_mut() {
            tx.from_call_type = FromCallType::Canister;
        }

        let all_txs = [fee_txs.clone(), asset_txs.clone()].concat();
        let mut mock_executor = MockTransactionExecutor::new();
        mock_executor.set_failure(&fee_txs[0].id, true); // Fail the first fee transaction
        let service = IcExecutorService::new(mock_executor);

        // Act
        let result = service.execute_transactions(&all_txs).await;

        // Assert
        assert!(result.is_ok());
        let exec_result = result.unwrap();
        assert!(!exec_result.is_success);
        assert_eq!(exec_result.errors.len(), 1);
        // Only the fee transactions should be executed, asset transactions should be skipped
        assert_eq!(exec_result.transactions.len(), 2);
        let fee_tx = exec_result
            .transactions
            .iter()
            .find(|tx| tx.id == fee_txs[0].id)
            .unwrap();
        assert_eq!(fee_tx.state, TransactionState::Fail);
        let asset_tx = exec_result
            .transactions
            .iter()
            .find(|tx| tx.id == asset_txs[0].id)
            .unwrap();
        assert_eq!(asset_tx.state, TransactionState::Success);
    }
}
