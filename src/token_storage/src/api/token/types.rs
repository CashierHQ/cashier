use candid::CandidType;
use serde::Deserialize;

use crate::types::{IndexId, LedgerId, TokenDto, TokenId, UserPreference};

#[derive(CandidType, Deserialize, Clone)]
pub struct TokenListResponse {
    pub tokens: Vec<TokenDto>,
    pub need_update_version: bool,
    // only exist if user is not anonymous
    pub perference: Option<UserPreference>,
}

/// The input for adding a token to a user's list
#[derive(CandidType, Deserialize, Clone)]
pub struct AddTokenInput {
    pub token_id: TokenId,
    pub token_data: Option<RegisterTokenInput>, // Optional data for registration if token doesn't exist
}

/// The input for adding multiple tokens to a user's list
#[derive(CandidType, Deserialize, Clone)]
pub struct AddTokensInput {
    pub tokens: Vec<(TokenId, Option<RegisterTokenInput>)>, // (token_id, optional registration data)
}

/// The input for updating a token's status (enable/disable)
#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateTokenStatusInput {
    pub token_id: TokenId,
    pub is_enabled: bool,
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
