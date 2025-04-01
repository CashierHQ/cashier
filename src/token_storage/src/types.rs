use std::borrow::Cow;

use candid::CandidType;
use candid::Principal;
use cashier_macros::storable;
use ic_stable_structures::{storable::Bound, Storable};
use serde::Deserialize;

pub type LedgerId = Principal;
pub type IndexId = Principal;

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

#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
#[storable]
pub enum Chain {
    IC,
}

impl Chain {
    pub fn from_str(chain: &str) -> Result<Self, String> {
        match chain {
            "IC" => Ok(Chain::IC),
            _ => Err(format!("Unsupported chain: {}", chain)),
        }
    }
}

#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct UserToken {
    pub icrc_ledger_id: Option<LedgerId>,
    pub icrc_index_id: Option<IndexId>,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub enabled: bool,
    pub unknown: bool,
    pub chain: Chain,
}

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
pub struct UserPreferenceInput {
    pub hide_zero_balance: bool,
    pub hide_unknown_token: bool,
    pub selected_chain: Vec<String>,
}

impl TryFrom<UserPreferenceInput> for UserPreference {
    type Error = String;

    fn try_from(input: UserPreferenceInput) -> Result<Self, Self::Error> {
        let chains = input
            .selected_chain
            .iter()
            .map(|chain| Chain::from_str(chain))
            .collect::<Result<Vec<Chain>, String>>()?;

        Ok(Self {
            hide_zero_balance: input.hide_zero_balance,
            hide_unknown_token: input.hide_unknown_token,
            selected_chain: chains,
        })
    }
}
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddTokenInput {
    pub chain: Chain,
    pub ledger_id: Option<LedgerId>,
    pub index_id: Option<IndexId>,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub enabled: Option<bool>,
    pub unknown: Option<bool>,
}

impl From<AddTokenInput> for UserToken {
    fn from(input: AddTokenInput) -> Self {
        Self {
            icrc_ledger_id: input.ledger_id,
            icrc_index_id: input.index_id,
            symbol: input.symbol,
            decimals: input.decimals,
            enabled: input.enabled.unwrap_or(false),
            unknown: input.unknown.unwrap_or(false),
            chain: input.chain,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct RemoveTokenInput {
    pub chain: Chain,
    pub ledger_id: Option<LedgerId>,
}
