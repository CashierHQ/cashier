// File: src/token_storage/src/types.rs

use std::borrow::Cow;

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
    pub icrc_ledger_id: Option<LedgerId>,
    pub icrc_index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: Chain,
    pub logo_url: Option<String>,
    pub is_default: bool,
}

impl RegistryToken {
    pub fn generate_id(chain: &Chain, ledger_id: Option<&LedgerId>) -> Result<TokenId, String> {
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
    pub balance: String,   // Storing as string to handle large numbers
    pub last_updated: u64, // Timestamp
}

// User preferences (mostly unchanged)
#[storable]
#[derive(Clone, Eq, PartialEq, Debug, CandidType)]
pub struct UserPreference {
    pub hide_zero_balance: bool,
    pub hide_unknown_token: bool,
    pub selected_chain: Vec<Chain>,
    pub hidden_tokens: Vec<TokenId>,
}

impl Default for UserPreference {
    fn default() -> Self {
        Self {
            hide_zero_balance: false,
            hide_unknown_token: false,
            selected_chain: vec![Chain::IC],
            hidden_tokens: vec![],
        }
    }
}

impl UserPreference {
    /// Updates the user preference with new values from input, preserving existing values when input is None
    pub fn from_input(
        input: &UserPreferenceInput,
        existing: Option<&Self>,
    ) -> Result<Self, String> {
        // Start with the existing preference or default
        let mut preference = existing.cloned().unwrap_or_default();

        // Update fields if provided in the input
        if let Some(hide_zero) = input.hide_zero_balance {
            preference.hide_zero_balance = hide_zero;
        }

        if let Some(hide_unknown) = input.hide_unknown_token {
            preference.hide_unknown_token = hide_unknown;
        }

        if let Some(chains) = &input.selected_chain {
            // Convert string chains to Chain enum
            let mut chain_enums = Vec::with_capacity(chains.len());
            for chain_str in chains {
                match Chain::from_str(chain_str) {
                    Ok(chain) => chain_enums.push(chain),
                    Err(e) => return Err(e),
                }
            }

            // Only update if at least one valid chain is provided
            if !chain_enums.is_empty() {
                preference.selected_chain = chain_enums;
            }
        }

        if let Some(hidden) = &input.hidden_tokens {
            preference.hidden_tokens = hidden.clone();
        }

        Ok(preference)
    }
}

// Input/output DTOs
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UserPreferenceInput {
    pub hide_zero_balance: Option<bool>,
    pub hide_unknown_token: Option<bool>,
    pub selected_chain: Option<Vec<String>>,
    pub hidden_tokens: Option<Vec<TokenId>>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddTokenInput {
    pub chain: String,
    pub token_id: Option<String>,
    pub ledger_id: Option<LedgerId>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct RemoveTokenInput {
    pub token_id: String,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct RegisterTokenInput {
    pub chain: String,
    pub ledger_id: Option<LedgerId>,
    pub index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub logo_url: Option<String>,
    pub is_default: Option<bool>,
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
    pub balance: Option<String>,
}
