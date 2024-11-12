use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

use super::transaction::Transaction;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Status {
    Created,
    Processing,
    Success,
    Failed,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Action {
    pub id: String,
    pub status: Status,
    pub transactions: Vec<Transaction>,
}

impl Storable for Action {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
