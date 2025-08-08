// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use ic_stable_structures::Storable;
use ic_stable_structures::storable::Bound;
use serde::Deserialize;
use std::borrow::Cow;

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

    fn into_bytes(self) -> Vec<u8> {
        candid::encode_one(&self.0).expect("encoding should always succeed")
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
}
