// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;

use crate::types::chain::Chain;

use super::common::{IndexId, LedgerId, TokenId};

use serde::{Deserialize, Serialize};

#[derive(CandidType, Clone, Eq, PartialEq, Debug, Serialize, Deserialize)]
pub enum ChainTokenDetails {
    IC {
        ledger_id: LedgerId,
        index_id: Option<IndexId>,
        fee: candid::Nat,
    },
    // Add more variants for other chains as needed
}

impl ChainTokenDetails {
    pub fn index_id(&self) -> Option<IndexId> {
        match self {
            ChainTokenDetails::IC { index_id, .. } => *index_id,
            // Handle other chains if needed
        }
    }
}

// Central registry token definition
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct RegistryToken {
    pub id: TokenId,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: Chain,
    pub details: ChainTokenDetails,
    pub enabled_by_default: bool, // Indicates if the token is enabled by default
}

impl RegistryToken {
    pub fn generate_id(chain: &Chain, ledger_id: &str) -> Result<TokenId, String> {
        match (chain, ledger_id) {
            (Chain::IC, id) => Ok(format!("IC:{id}")),
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
