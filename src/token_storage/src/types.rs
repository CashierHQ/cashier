use std::borrow::Cow;

use candid::CandidType;
use candid::Principal;
use cashier_macros::storable;
use ic_stable_structures::{storable::Bound, Storable};
use serde::Deserialize;
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

#[storable]
#[derive(Clone, CandidType)]
pub struct Token {
    r#type: TokenType,
    enable: bool,
}

#[repr(u8)]
#[storable]
#[derive(Clone, CandidType)]
pub enum TokenType {
    Icrc(IcrcToken) = 1,
}

#[storable]
#[derive(Clone, CandidType)]
pub struct IcrcToken {
    ledger_id: Principal,
    index_id: Principal,
}
