// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    transaction::traits::TransactionExecutor, utils::topological_sort::kahn_topological_sort,
};
use cashier_backend_types::{
    error::CanisterError,
    link_v2::{graph::Graph, transaction_manager::ExecuteTransactionsResult},
    repository::transaction::v1::{Transaction, TransactionState},
};
use futures::future::join_all;
use std::collections::HashMap;

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

            let futures = level_txs
                .iter()
                .map(|&tx| executor.execute(tx.clone()))
                .collect::<Vec<_>>();
            let results = join_all(futures).await;

            for (&tx, result) in level_txs.iter().zip(results.into_iter()) {
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
        }

        Ok(ExecuteTransactionsResult {
            transactions: executed_transactions,
            is_success,
            errors,
        })
    }
}
