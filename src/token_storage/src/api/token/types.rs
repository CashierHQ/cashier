// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
    pub token_data: Option<AddTokenItem>, // Optional data for registration if token doesn't exist
}

/// The input for adding multiple tokens to a user's list
#[derive(CandidType, Deserialize, Clone)]
pub struct AddTokensInput {
    pub tokens_enable: Vec<(TokenId, Option<AddTokenItem>)>, // (token_id, optional registration data)
    pub tokens_disable: Vec<(TokenId, Option<AddTokenItem>)>, // (token_id, optional registration data)
}

/// The input for updating a token's status (enable/disable)
#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateTokenStatusInput {
    pub token_id: TokenId,
    pub is_enabled: bool,
}

/// The input for updating a token's status (enable/disable)
#[derive(CandidType, Deserialize, Clone)]
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
