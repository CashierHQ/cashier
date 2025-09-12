// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::Repositories;
use crate::services::transaction_manager::traits::TransactionExecutor;
use crate::services::transaction_manager::traits::TransactionValidator;
use crate::services::transaction_manager::{
    service::TransactionManagerService, traits::BatchExecutor,
};
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::transaction::v2::Transaction;
use cashier_backend_types::repository::transaction::v2::TransactionState;
use cashier_common::runtime::IcEnvironment;

impl<E: 'static + IcEnvironment + Clone, R: 'static + Repositories> BatchExecutor<E>
    for TransactionManagerService<E, R>
{
    /// Execute multiple canister transactions in parallel (batch)
    ///
    /// This method takes a mutable slice of transactions and executes them concurrently.
    /// Returns Ok(()) if all succeed, or Err(Vec<CanisterError>) with all errors.
    async fn execute_canister_txs_batch(
        &mut self,
        txs: &mut [Transaction],
    ) -> Result<(), CanisterError> {
        use futures::future;
        let mut futures_vec = Vec::with_capacity(txs.len());
        for tx in txs.iter_mut() {
            let mut service = self.clone();
            futures_vec.push(async move { service.execute_canister_tx(tx).await });
        }
        let results = future::join_all(futures_vec).await;
        let errors: Vec<CanisterError> = results
            .into_iter()
            .filter_map(std::result::Result::err)
            .collect();
        if errors.is_empty() {
            Ok(())
        } else {
            Err(CanisterError::BatchError(errors))
        }
    }

    /// Batch manual check status for a list of transactions.
    /// Returns a Vec of (tx_id, Result<TransactionState, CanisterError>) for each transaction.
    async fn manual_check_status_batch(
        &self,
        txs: Vec<Transaction>,
        all_txs: Vec<Transaction>,
    ) -> Vec<(String, TransactionState)> {
        use futures::future;
        let futures_vec = txs
            .iter()
            .map(|tx| self.manual_check_status(tx, all_txs.clone()))
            .collect::<Vec<_>>();
        let results = future::join_all(futures_vec).await;
        txs.into_iter().map(|tx| tx.id).zip(results).collect()
    }
}
