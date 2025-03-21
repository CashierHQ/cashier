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

#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct UserToken {
    pub icrc_ledger_id: Option<LedgerId>,
    pub icrc_index_id: Option<IndexId>,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub enabled: Option<bool>,
    pub chain: Chain,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddTokenInput {
    pub chain: Chain,
    pub ledger_id: Option<LedgerId>,
    pub index_id: Option<IndexId>,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub enabled: Option<bool>,
}

impl From<AddTokenInput> for UserToken {
    fn from(input: AddTokenInput) -> Self {
        Self {
            icrc_ledger_id: input.ledger_id,
            icrc_index_id: input.index_id,
            symbol: input.symbol,
            decimals: input.decimals,
            enabled: input.enabled,
            chain: input.chain,
        }
    }
}



#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct RemoveTokenInput {
    pub chain: Chain,
    pub ledger_id: Option<LedgerId>,
}
