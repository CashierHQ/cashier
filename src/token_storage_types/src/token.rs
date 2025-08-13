use candid::CandidType;
use cashier_macros::storable;
use serde::{Deserialize, Serialize};

use crate::{chain::Chain, user::UserPreference, IndexId, LedgerId};

/// A token identifier
#[derive(CandidType, Clone, Eq, PartialEq, Debug, Hash, Ord, PartialOrd)]
#[storable]
pub enum TokenId {
    /// IC token
    IC {
        /// The ledger canister id for the token
        ledger_id: LedgerId,
    },
}

impl TokenId {

    /// Returns the chain id
    pub fn chain(&self) -> Chain {
        match self {
            TokenId::IC { .. } => Chain::IC,
        }
    }

}

impl ToString for TokenId {
    fn to_string(&self) -> String {
        match self {
            TokenId::IC { ledger_id } => format!("IC:{}", ledger_id),
        }
    }
}

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

    /// Returns the chain type
    pub fn chain(&self) -> Chain {
        match self {
            ChainTokenDetails::IC { .. } => Chain::IC,
        }
    }

    /// Returns the token_id
    pub fn token_id(&self) -> TokenId {
        match self {
            ChainTokenDetails::IC { ledger_id, .. } => TokenId::IC { ledger_id: *ledger_id },
        }
    }
}

/// DTO for all tokens, flexible for all chains
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct TokenDto {
    pub id: TokenId,
    /// This is a string representation of the token id.
    /// It is always generated from the token_id.
    pub string_id: String,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: Chain,
    pub enabled: bool,
    pub balance: Option<u128>,
    pub details: ChainTokenDetails, // Use the enum for chain-specific details
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddTokenInput {
    pub token_id: TokenId,
    pub index_id: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddTokensInput {
    pub token_ids: Vec<TokenId>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UpdateTokenInput {
    pub token_id: TokenId,
    pub is_enabled: bool,
}

// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#[derive(CandidType, Deserialize, Clone)]
pub struct TokenListResponse {
    pub tokens: Vec<TokenDto>,
    pub need_update_version: bool,
    // only exist if user is not anonymous
    pub perference: Option<UserPreference>,
}

/// The input for updating a token's status (enable/disable)
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct UpdateTokenBalanceInput {
    pub token_id: TokenId,
    pub balance: u128,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct RegisterTokenInput {
    pub id: String,
    pub chain: String,
    pub ledger_id: Option<LedgerId>,
    pub index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub enabled_by_default: bool,
    pub fee: Option<candid::Nat>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddTokenItem {
    pub chain: String,
    pub ledger_id: Option<LedgerId>,
    pub index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub fee: Option<candid::Nat>,
}

impl From<RegisterTokenInput> for AddTokenItem {
    fn from(input: RegisterTokenInput) -> Self {
        Self {
            chain: input.chain,
            ledger_id: input.ledger_id,
            index_id: input.index_id,
            symbol: input.symbol,
            name: input.name,
            decimals: input.decimals,
            fee: input.fee,
        }
    }
}

impl From<AddTokenItem> for RegisterTokenInput {
    fn from(item: AddTokenItem) -> Self {
        let id = format!("{}:{}", item.chain, item.ledger_id.unwrap());
        Self {
            id,
            chain: item.chain,
            ledger_id: item.ledger_id,
            index_id: item.index_id,
            symbol: item.symbol,
            name: item.name,
            decimals: item.decimals,
            enabled_by_default: false, // Default value
            fee: item.fee,
        }
    }
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct RegistryStats {
    pub total_tokens: usize,
    pub total_enabled_default: usize,
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct UserTokens {
    pub enabled: usize,
    pub registry_tokens: usize,
    pub version: u64,
}

#[cfg(test)]
mod tests {
    use candid::Principal;

    use super::*;

    #[test]
    fn it_should_return_ic_chain_type_from_details() {
        let details = ChainTokenDetails::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            index_id: None,
            fee: 0u64.into(),
        };
        assert_eq!(details.chain(), Chain::IC);
    }

    #[test]
    fn it_should_return_ic_token_id_from_details() {
        let details = ChainTokenDetails::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            index_id: None,
            fee: 0u64.into(),
        };
        assert_eq!(details.token_id(), TokenId::IC { ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap() });
    }

    #[test]
    fn it_should_return_ic_chain_type_from_token_id() {
        let token_id = TokenId::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };
        assert_eq!(token_id.chain(), Chain::IC);
    }

    #[test]
    fn it_should_return_ic_token_id_string_representation_from_token_id() {
        let token_id = TokenId::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };
        assert_eq!(token_id.to_string(), "IC:ryjl3-tyaaa-aaaaa-aaaba-cai");
    }
}
