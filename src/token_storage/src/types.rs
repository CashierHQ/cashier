// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// File: src/token_storage/src/types.rs

use std::borrow::Cow;
use std::collections::HashSet;

use candid::CandidType;
use candid::Principal;
use cashier_macros::storable;
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use serde::Deserialize;

pub type LedgerId = Principal;
pub type IndexId = Principal;
pub type TokenId = String; // A unique identifier for tokens, e.g. "IC:ryjl3-tyaaa-aaaaa-aaaba-cai"

#[derive(Default)]
pub struct Candid<T>(pub T)
where
    T: CandidType + for<'de> Deserialize<'de>;

impl<T> Storable for Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(candid::encode_one(&self.0).expect("encoding should always succeed"))
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(candid::decode_one(bytes.as_ref()).expect("decoding should succeed"))
    }
}

impl<T> Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    /// Consumes the wrapper and returns the inner value
    pub fn into_inner(self) -> T {
        self.0
    }

    /// Returns a reference to the inner value
    pub fn inner(&self) -> &T {
        &self.0
    }

    /// Returns a mutable reference to the inner value
    pub fn inner_mut(&mut self) -> &mut T {
        &mut self.0
    }
}

// ... Keep the existing Candid implementation ...

#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
#[storable]
pub enum Chain {
    IC,
    // Can add more chains in the future
}

impl Chain {
    pub fn from_str(chain: &str) -> Result<Self, String> {
        match chain {
            "IC" => Ok(Chain::IC),
            _ => Err(format!("Unsupported chain: {}", chain)),
        }
    }

    pub fn to_str(&self) -> String {
        match self {
            Chain::IC => "IC".to_string(),
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
    pub enabled_by_default: bool,
    // this part belong to IC
    pub icrc_ledger_id: Option<LedgerId>,
    pub icrc_index_id: Option<IndexId>,
    // ledger fee, not usually change in IC
    pub fee: Option<candid::Nat>,
}

impl RegistryToken {
    pub fn generate_id(chain: &Chain, ledger_id: Option<LedgerId>) -> Result<TokenId, String> {
        match (chain, ledger_id) {
            (Chain::IC, Some(id)) => Ok(format!("IC:{}", id.to_text())),
            _ => Err("Cannot generate token ID: missing required fields".to_string()),
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

// User preferences (mostly unchanged)
#[storable]
#[derive(Clone, Eq, PartialEq, Debug, CandidType)]
pub struct UserPreference {
    pub hide_zero_balance: bool,
    pub hide_unknown_token: bool,
    pub selected_chain: Vec<Chain>,
}

impl Default for UserPreference {
    fn default() -> Self {
        Self {
            hide_zero_balance: false,
            hide_unknown_token: false,
            selected_chain: vec![Chain::IC],
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct RegistryTokenDto {
    pub id: String,
    pub icrc_ledger_id: Option<LedgerId>,
    pub icrc_index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: String,
    pub fee: Option<candid::Nat>,
}

// Implementation for converting RegistryToken to RegistryTokenDto
impl From<RegistryToken> for RegistryTokenDto {
    fn from(token: RegistryToken) -> Self {
        Self {
            id: token.id,
            icrc_ledger_id: token.icrc_ledger_id,
            icrc_index_id: token.icrc_index_id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.chain.to_str(),
            fee: token.fee,
        }
    }
}

// Implement From trait to convert RegistryTokenDto to TokenDto
impl From<RegistryTokenDto> for TokenDto {
    fn from(registry_token: RegistryTokenDto) -> Self {
        Self {
            id: registry_token.id,
            icrc_ledger_id: registry_token.icrc_ledger_id,
            icrc_index_id: registry_token.icrc_index_id,
            symbol: registry_token.symbol,
            name: registry_token.name,
            decimals: registry_token.decimals,
            chain: registry_token.chain,
            enabled: true,    // Default to enabled
            balance: Some(0), // Default balance to 0
            fee: registry_token.fee,
        }
    }
}

impl From<RegistryToken> for TokenDto {
    fn from(registry_token: RegistryToken) -> Self {
        Self {
            id: registry_token.id,
            icrc_ledger_id: registry_token.icrc_ledger_id,
            icrc_index_id: registry_token.icrc_index_id,
            symbol: registry_token.symbol,
            name: registry_token.name,
            decimals: registry_token.decimals,
            chain: registry_token.chain.to_str(),
            enabled: true,    // Default to enabled
            balance: Some(0), // Default balance to 0
            fee: registry_token.fee,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct TokenDto {
    pub id: String,
    pub icrc_ledger_id: Option<LedgerId>,
    pub icrc_index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: String,
    pub enabled: bool,
    pub balance: Option<u128>,
    pub fee: Option<candid::Nat>,
}

impl TokenDto {
    pub fn get_address_from_id(&self) -> String {
        // Extract the address from the token ID
        if let Some(pos) = self.id.find(':') {
            self.id[pos + 1..].to_string()
        } else {
            self.id.clone() // Return the full ID if no ':' is found
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UpdateBulkBalancesInput {
    pub token_balances: Vec<(String, u128)>,
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
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct UserTokenList {
    // version only used for sync from registry to UserTokenList, do not use for other purpose
    pub version: u64,
    pub enable_list: HashSet<TokenId>,
    pub disable_list: HashSet<TokenId>,
}

impl Default for UserTokenList {
    fn default() -> Self {
        Self {
            version: 1,
            enable_list: HashSet::new(),
            disable_list: HashSet::new(),
        }
    }
}

impl UserTokenList {
    pub fn init_with_current_registry(
        &mut self,
        registry_tokens: Vec<RegistryToken>,
        version: u64,
    ) -> Result<(), String> {
        for token in registry_tokens {
            if token.enabled_by_default {
                self.enable_list.insert(token.id.clone());
            } else {
                self.disable_list.insert(token.id.clone());
            }
        }

        self.version = version;
        Ok(())
    }
}
