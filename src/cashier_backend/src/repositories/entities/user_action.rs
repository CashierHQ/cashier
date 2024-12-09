use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

const _KEY_PATTERN: &str = "user#{}#action#{}}";

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UserAction {
    pub pk: String,
    pub created_at: u64,
    pub action_type: String,
}

impl UserAction {
    pub fn build_pk(user_id: String, action_id: String) -> String {
        format!("user#{}#action#{}", user_id, action_id)
    }

    pub fn new(user_id: String, action_id: String, action_type: String, ts: u64) -> Self {
        Self {
            pk: Self::build_pk(user_id.clone(), action_id.clone()),
            created_at: ts,
            action_type: action_type,
        }
    }

    pub fn split_pk(&self) -> (String, String) {
        let parts: Vec<&str> = self.pk.split('#').collect();
        let user_id = parts.get(1).unwrap_or(&"").to_string();
        let action_id = parts.get(3).unwrap_or(&"").to_string();
        (user_id, action_id)
    }
}

impl Storable for UserAction {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
