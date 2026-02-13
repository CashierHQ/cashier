// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::token::IcrcStandard;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CachedTokenStandard {
    pub standards: Vec<IcrcStandard>,
    pub updated_at: u64,
}
