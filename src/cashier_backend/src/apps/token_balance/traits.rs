// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;
use std::collections::HashMap;
use transaction_manager::icrc_token::types::Account;

/// Trait for fetching token balances for a user
pub trait TokenBalanceFetcher {
    /// Get the balance of a batch of tokens for a user
    /// # Arguments
    /// * `account` - The account of the user for whom to fetch the token balance
    /// * `token_principals` - The principals of the tokens for which to fetch the balances
    /// # Returns
    /// * `Result<HashMap<Principal, Nat>, CanisterError>` - A map of token principals to their respective balances for the user, or an error if the operation fails
    async fn get_batch_token_balances(
        &self,
        account: &Account,
        token_principals: &[Principal],
    ) -> Result<HashMap<Principal, Nat>, CanisterError>;
}
