// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repositories::processing_transaction::ProcessingTransactionRepository,
    types::error::CanisterError,
};
use cashier_types::processing_transaction::ProcessingTransaction;

pub struct TrackingProcessingTransactionService {
    processing_transaction_repository: ProcessingTransactionRepository,
}

impl TrackingProcessingTransactionService {
    pub fn new(processing_transaction_repository: ProcessingTransactionRepository) -> Self {
        Self {
            processing_transaction_repository,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(ProcessingTransactionRepository::new())
    }

    /// Add a transaction to processing tracking when it transitions to Processing state
    pub fn start_tracking(
        &self,
        transaction_id: String,
        start_time: u64,
        ttl_nanoseconds: u64,
    ) -> Result<(), CanisterError> {
        let processing_tx =
            ProcessingTransaction::new(transaction_id.clone(), start_time, ttl_nanoseconds);

        // Check if already being tracked
        if self
            .processing_transaction_repository
            .exists(&transaction_id)
        {
            return Err(CanisterError::ValidationErrors(format!(
                "Transaction {} is already being tracked",
                transaction_id
            )));
        }

        self.processing_transaction_repository
            .create(transaction_id, processing_tx);
        Ok(())
    }

    /// Remove a transaction from tracking when it completes (Success/Fail)
    pub fn stop_tracking(&self, transaction_id: &str) -> Result<(), CanisterError> {
        self.processing_transaction_repository
            .delete(transaction_id);
        Ok(())
    }

    /// Get all processing transactions that have timed out
    pub fn get_timed_out(
        &self,
        current_time: u64,
    ) -> Result<Vec<ProcessingTransaction>, CanisterError> {
        let all_processing = self.processing_transaction_repository.get_all();

        let timed_out = all_processing
            .into_iter()
            .filter(|ptx| ptx.is_timed_out(current_time))
            .collect();

        Ok(timed_out)
    }

    /// Get a specific processing transaction by ID
    pub fn get(
        &self,
        transaction_id: &str,
    ) -> Result<Option<ProcessingTransaction>, CanisterError> {
        let processing_tx = self.processing_transaction_repository.get(transaction_id);
        Ok(processing_tx)
    }

    /// Check if a transaction is currently being tracked
    pub fn is_tracking(&self, transaction_id: &str) -> Result<bool, CanisterError> {
        Ok(self
            .processing_transaction_repository
            .exists(transaction_id))
    }
}
