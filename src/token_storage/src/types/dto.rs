use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::common::TokenId;
use super::token::ChainTokenDetails;

/// DTO for all tokens, flexible for all chains
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct TokenDto {
    pub id: TokenId,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: String,
    pub enabled: bool,
    pub balance: Option<u128>,
    pub details: ChainTokenDetails, // Use the enum for chain-specific details
}

// Conversion from RegistryToken to TokenDto
use super::token::RegistryToken;
impl From<RegistryToken> for TokenDto {
    fn from(token: RegistryToken) -> Self {
        Self {
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.chain.to_str(),
            enabled: token.enabled_by_default,
            balance: None,
            details: token.details, // Directly use the enum
        }
    }
}
