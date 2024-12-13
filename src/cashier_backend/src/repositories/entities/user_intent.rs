use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

const _KEY_PATTERN: &str = "user#{}#intent#{}}";

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UserIntent {
    pub pk: String,
    pub created_at: u64,
    pub intent_type: String,
}

impl UserIntent {
    pub fn build_pk(user_id: String, intent_id: String) -> String {
        format!("user#{}#intent#{}", user_id, intent_id)
    }

    pub fn new(user_id: String, intent_id: String, intent_type: String, ts: u64) -> Self {
        Self {
            pk: Self::build_pk(user_id.clone(), intent_id.clone()),
            created_at: ts,
            intent_type: intent_type,
        }
    }

    pub fn split_pk(&self) -> (String, String) {
        let parts: Vec<&str> = self.pk.split('#').collect();
        let user_id = parts.get(1).unwrap_or(&"").to_string();
        let intent_id = parts.get(3).unwrap_or(&"").to_string();
        (user_id, intent_id)
    }
}

impl Storable for UserIntent {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
