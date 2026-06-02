// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    error::CanisterError,
    token::{SupportedStandardRecord, TokenMetadata},
};

pub trait TokenMetadataFetcher {
    /// Fetch token metadata (name, fee, decimals, symbol) for given ledger ID
    /// # Arguments
    /// * `ledger_id` - Principal of the token ledger canister
    /// # Returns
    /// * `Ok(TokenMetadata)` on success, containing token metadata
    /// * `Err(CanisterError)` if the canister call fails or returns invalid
    async fn fetch_token_metadata(
        &self,
        ledger_id: Principal,
    ) -> Result<TokenMetadata, CanisterError>;

    /// Fetch supported standards for given ledger ID
    /// # Arguments
    /// * `ledger_id` - Principal of the token ledger canister
    /// # Returns
    /// * `Ok(Vec<SupportedStandardRecord>)` on success, containing supported standards
    /// * `Err(CanisterError)` if the canister call fails or returns invalid
    async fn icrc10_supported_standards(
        &self,
        ledger_id: Principal,
    ) -> Result<Vec<SupportedStandardRecord>, CanisterError>;
}
