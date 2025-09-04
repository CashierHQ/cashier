// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_common::chain::Chain;
use cashier_macros::storable;
use token_storage_types::{
    TokenId,
    token::{ChainTokenDetails, TokenDto},
};

// Central registry token definition
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct RegistryToken {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: Chain,
    pub details: ChainTokenDetails,
    pub enabled_by_default: bool, // Indicates if the token is enabled by default
}

impl From<RegistryToken> for TokenDto {
    fn from(token: RegistryToken) -> Self {
        let token_id = token.details.token_id();
        Self {
            string_id: token_id.to_string(),
            id: token_id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.chain,
            enabled: token.enabled_by_default,
            balance: None,
            details: token.details, // Directly use the enum
        }
    }
}

// User's token preference
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct UserToken {
    pub token_id: TokenId,
    pub enabled: bool,
}

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
