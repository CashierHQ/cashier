// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::borrow::Cow;

use candid::CandidType;
use cashier_macros::storable;
use ic_mple_structures::RefCodec;

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

#[storable]
pub enum TokenRegistryMetadataCodec {
    V1(TokenRegistryMetadata),
}

impl RefCodec<TokenRegistryMetadata> for TokenRegistryMetadataCodec {
    fn decode_ref(source: &Self) -> Cow<'_, TokenRegistryMetadata> {
        match source {
            TokenRegistryMetadataCodec::V1(link) => Cow::Borrowed(link),
        }
    }

    fn encode(dest: TokenRegistryMetadata) -> Self {
        TokenRegistryMetadataCodec::V1(dest)
    }
}
