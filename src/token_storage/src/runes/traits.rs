// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{bitcoin::omnity_bitcoin::GetBtcAddressArgs, error::CanisterError};

pub trait OmnityBitcoinTrait {
    /// Get the Rune deposit BTC address associated with a receiver on a target chain.
    /// # Arguments
    /// * `omnity_bitcoin` - The Omnity Bitcoin canister id
    /// * `args` - The address lookup arguments
    /// # Returns
    /// * `Result<String, CanisterError>` - The deposit address if it exists
    async fn get_btc_address(
        &self,
        omnity_bitcoin: Principal,
        args: GetBtcAddressArgs,
    ) -> Result<String, CanisterError>;
}
