// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::error::CanisterError;
use std::collections::HashMap;
use token_storage_types::token::IcrcStandard;

pub trait TokenStandardCache {
    async fn get_batch_token_standards(
        &mut self,
        token_principals: &[Principal],
    ) -> Result<HashMap<Principal, Vec<IcrcStandard>>, CanisterError>;
}
