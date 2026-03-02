// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::error::CanisterError;
use token_storage_types::token::IcrcStandard;

pub trait TokenStorageClient {
    /// Get token standards for a given token principal
    /// # Arguments
    /// * `token_principal` - The principal of the token to retrieve standards for
    /// # Returns
    /// * `Option<Vec<IcrcStandard>>` - The list of token standards if found
    async fn get_token_standards(
        &self,
        token_principal: &Principal,
    ) -> Result<Vec<IcrcStandard>, CanisterError>;

    /// Set the canister ID for the token storage client
    fn set_canister_id(&mut self, canister_id: Principal);
}
