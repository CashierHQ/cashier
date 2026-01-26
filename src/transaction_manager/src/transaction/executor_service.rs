// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::transaction::traits::TransactionExecutor;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::transaction_manager::ExecuteTransactionsResult,
    repository::transaction::v1::{Transaction, TransactionState},
};
use futures::future::join_all;

pub struct ExecutorService<E: TransactionExecutor + Clone> {
    executor: E,
}

impl<E: TransactionExecutor + Clone> ExecutorService<E> {
    pub fn new(executor: E) -> Self {
        Self { executor }
    }

    /// Executes a list of transactions using the underlying executor.
    /// # Arguments
    /// * `transactions` - A slice of transactions to be executed
    /// # Returns
    /// * `Result<ExecuteTransactionsResult, CanisterError>` - The result of executing the transactions
    pub async fn execute_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<ExecuteTransactionsResult, CanisterError> {
        let mut executed_transactions = Vec::<Transaction>::new();
        let mut errors = Vec::<String>::new();
        let mut is_success = true;
        let executor = self.executor.clone();

        let futures = transactions
            .iter()
            .map(|transaction| executor.execute(transaction.clone()))
            .collect::<Vec<_>>();
        let results = join_all(futures).await;

        for (transaction, result) in transactions.iter().zip(results.into_iter()) {
            match result {
                Ok(_) => {
                    executed_transactions.push(Transaction {
                        state: TransactionState::Success,
                        ..transaction.clone()
                    });
                }
                Err(e) => {
                    let mut failed_tx = transaction.clone();
                    failed_tx.state = TransactionState::Fail;
                    executed_transactions.push(failed_tx);
                    errors.push(format!(
                        "Failed to execute transaction {}: {}",
                        transaction.id, e
                    ));
                    is_success = false;
                }
            }
        }

        Ok(ExecuteTransactionsResult {
            transactions: executed_transactions,
            is_success,
            errors,
        })
    }
}
