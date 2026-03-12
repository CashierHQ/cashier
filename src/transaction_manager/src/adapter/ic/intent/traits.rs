// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        intent::{v1::Intent, v3::IntentV3},
        transaction::v1::Transaction,
    },
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

pub trait IntentAdapterTraitV3 {
    /// Converts an intent into a list of transactions based on its type.
    /// # Arguments
    /// * `canister_id` - The canister ID for the transactions.
    /// * `ts` - The timestamp for the transactions.
    /// * `intent` - The intent to be converted.
    /// # Returns
    /// * `Result<Vec<Transaction>, CanisterError>` - A vector of transactions or an error.
    fn intent_to_transactions_v3(
        &self,
        canister_id: Principal,
        ts: u64,
        intent: &IntentV3,
    ) -> Result<Vec<Transaction>, CanisterError>;
}
