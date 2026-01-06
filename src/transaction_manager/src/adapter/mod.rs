// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod ic;

use cashier_backend_types::{
    error::CanisterError,
    repository::{intent::v1::Intent, transaction::v1::Transaction},
};

pub trait IntentAdapterTrait {
    /// Converts an intent into a list of transactions based on its type.
    /// # Arguments
    /// * `ts` - The timestamp for the transactions.
    /// * `intent` - The intent to be converted.
    /// # Returns
    /// * `Result<Vec<Transaction>, CanisterError>` - A vector of transactions or an error.
    fn intent_to_transactions(
        &self,
        ts: u64,
        intent: &Intent,
    ) -> Result<Vec<Transaction>, CanisterError>;
}
