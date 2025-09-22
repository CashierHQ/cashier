// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;

// Balance cache for a user's token
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct TokenBalance {
    pub balance: u128,
    pub last_updated: u64, // Timestamp
}

#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct TokenRegistryMetadata {
    pub version: u64,
    pub last_updated: u64, // Timestamp
}

impl Default for TokenRegistryMetadata {
    fn default() -> Self {
        Self {
            version: 1,
            last_updated: 0,
        }
    }
}
