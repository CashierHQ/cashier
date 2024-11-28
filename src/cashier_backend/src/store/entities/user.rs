use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

pub const PK_PREFIX: &str = "user";

#[derive(Clone, Debug, Default, CandidType, Deserialize, Serialize)]
pub struct User {
    pub pk: String,
    pub email: Option<String>,
    pub wallet: String,
}

impl User {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PREFIX, id)
    }

    pub fn new(id: String, email: Option<String>, wallet: String) -> Self {
        Self {
            pk: Self::build_pk(id),
            email,
            wallet,
        }
    }
}

impl Storable for User {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
