use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

const _KEY_PATTERN: &str = "intent#{}#transaction#{}";

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct IntentTransaction {
    pub pk: String,
    pub created_at: u64,
}

impl IntentTransaction {
    pub fn build_pk(intent_id: String, transaction_id: String) -> String {
        format!("intent#{}#transaction#{}", intent_id, transaction_id)
    }

    pub fn new(intent_id: String, transaction_id: String, ts: u64) -> Self {
        Self {
            pk: Self::build_pk(intent_id.clone(), transaction_id.clone()),
            created_at: ts,
        }
    }

    pub fn split_pk(&self) -> (String, String) {
        let parts: Vec<&str> = self.pk.split('#').collect();
        let intent_id = parts.get(1).unwrap_or(&"").to_string();
        let transaction_id = parts.get(3).unwrap_or(&"").to_string();
        (intent_id, transaction_id)
    }
}

impl Storable for IntentTransaction {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
