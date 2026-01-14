// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use token_storage_types::error::CanisterError;

pub trait Icrc7ValidatorTrait {
    /// Validates if the given user is the owner of the specified token in the ICRC-7 ledger.
    /// # Arguments
    /// * `user_id` - The principal ID of the user to validate
    /// * `ledger_id` - The principal ID of the ICRC-7 ledger can
    /// * `token_id` - The token ID to check ownership for
    /// # Returns
    /// * `Result<bool, CanisterError>` - True if the user is the owner, false otherwise, or an error if the validation fails
    async fn validate_owner_of(
        &self,
        user_id: &Principal,
        ledger_id: &Principal,
        token_id: &Nat,
    ) -> Result<bool, CanisterError>;
}
