// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use std::sync::Arc;
use token_storage_types::error::CanisterError;

pub trait CkBtcMinterTrait {
    /// Sets the CKBTC minter canister ID
    /// # Arguments
    /// * `canister_id` - The principal ID of the CKBTC minter canister
    /// # Returns - None
    fn set_canister_id(&mut self, canister_id: Principal);

    /// Get the BTC address associated with a user.
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// # Returns
    /// * `Result<String, CanisterError>` - The BTC address if it exists
    async fn get_btc_address(&self, user: Principal) -> Result<String, CanisterError>;

    /// Update the balance of CKBTC for a user.
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// # Returns
    /// * `Result<Nat, CanisterError>` - The updated balance or an error message
    async fn update_balance(&self, user: Principal) -> Result<Nat, CanisterError> {
        Err(CanisterError::unauthorized(
            "update_balance not implemented",
        ))
    }
}
