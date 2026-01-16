// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use std::sync::Arc;
use token_storage_types::error::CanisterError;

pub trait CkBtcMinterTrait {
    /// Get the BTC address associated with a user.
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// * `ckbtc_minter` - The principal ID of the CKBTC minter canister
    /// # Returns
    /// * `Result<String, CanisterError>` - The BTC address if it exists
    async fn get_btc_address(
        &self,
        user: Principal,
        ckbtc_minter: Principal,
    ) -> Result<String, CanisterError>;

    /// Update the balance of CKBTC for a user.
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// * `ckbtc_minter` - The principal ID of the CKBTC minter canister
    /// # Returns
    /// * `Result<Nat, CanisterError>` - The updated balance or an error message
    async fn update_balance(
        &self,
        user: Principal,
        ckbtc_minter: Principal,
    ) -> Result<Nat, CanisterError> {
        Err(CanisterError::unauthorized(
            "update_balance not implemented",
        ))
    }
}
