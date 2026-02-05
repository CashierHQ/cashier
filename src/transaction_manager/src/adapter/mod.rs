// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod ic;

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{intent::v1::Intent, transaction::v1::Transaction},
};
use cashier_shared::types::Intent as IntentShared;

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

pub trait IntentAdapterV3Trait {
    fn intent_to_transactions_v3(
        &self,
        canister_id: Principal,
        ts: u64,
        intent: &IntentShared,
    ) -> Result<Vec<Transaction>, CanisterError>;
}
