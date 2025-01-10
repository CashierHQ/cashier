use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

const PK_PATTERN: &str = "intent";

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Intent {
    pub pk: String,
    pub state: String,
    pub intent_type: String,
    pub link_id: String,
    pub creator_id: String,
    pub tx_map: Vec<Vec<String>>,
}

impl Intent {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PATTERN, id)
    }

    pub fn new(
        id: String,
        state: String,
        intent_type: String,
        link_id: String,
        creator_id: String,
        tx_map: Vec<Vec<String>>,
    ) -> Self {
        Self {
            pk: Self::build_pk(id),
            state,
            intent_type: intent_type,
            link_id,
            creator_id,
            tx_map,
        }
    }
}

impl Storable for Intent {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
