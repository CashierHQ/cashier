// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
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
}
