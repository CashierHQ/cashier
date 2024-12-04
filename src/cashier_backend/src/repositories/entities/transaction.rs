use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

use crate::types::transaction::TransactionStatus;

const PK_PATTERN: &str = "transaction";

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Transaction {
    pub pk: String,
    pub canister_id: String,
    pub method: String,
    pub arg: String,
    pub status: TransactionStatus,
}

impl Transaction {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PATTERN, id)
    }

    pub fn new(
        id: String,
        canister_id: String,
        method: String,
        arg: String,
        status: TransactionStatus,
    ) -> Self {
        Self {
            pk: Self::build_pk(id),
            canister_id,
            method,
            arg,
            status,
        }
    }
}

impl Storable for Transaction {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
