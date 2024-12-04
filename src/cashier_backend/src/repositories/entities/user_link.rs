use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};

pub const KEY_PATTERN: &str = "user#{}#link#{}";

#[derive(Clone, Debug, Default, CandidType, Deserialize, Serialize)]
pub struct UserLink {
    pub pk: String,
    pub user_id: String,
    pub link_id: String,
    pub created_at: u64,
}

impl UserLink {
    pub fn build_pk(user_id: String, link_id: String) -> String {
        format!("user#{}#link#{}", user_id, link_id)
    }

    pub fn split_pk(&self) -> (String, String) {
        let parts: Vec<&str> = self.pk.split('#').collect();
        let user_id = parts.get(1).unwrap_or(&"").to_string();
        let link_id = parts.get(3).unwrap_or(&"").to_string();
        (user_id, link_id)
    }

    pub fn new(user_id: String, link_id: String, ts: u64) -> Self {
        Self {
            pk: Self::build_pk(user_id.clone(), link_id.clone()),
            user_id,
            link_id,
            created_at: ts,
        }
    }
}

impl Storable for UserLink {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(candid::Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        candid::Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Unbounded;
}
