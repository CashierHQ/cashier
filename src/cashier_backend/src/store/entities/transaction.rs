use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

use crate::types::{account::Account, link::Chain, transaction::TransactionStatus};

const PK_PATTERN: &str = "transaction";

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Transaction {
    pub pk: String,
    pub status: TransactionStatus,
    pub to: Account,
    pub from: Account,
    pub amount: u64,
    pub address: String,
    pub chain: Chain,
}

impl Transaction {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PATTERN, id)
    }

    pub fn new(
        id: String,
        status: TransactionStatus,
        to: Account,
        from: Account,
        amount: u64,
        address: String,
        chain: Chain,
    ) -> Self {
        Self {
            pk: Self::build_pk(id),
            status,
            to,
            from,
            amount,
            address,
            chain,
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
