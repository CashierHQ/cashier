use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

const _KEY_PATTERN: &str = "link#{}#type#{}#intent#{}";

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkIntent {
    pub pk: String,
    pub created_at: u64,
}

impl LinkIntent {
    pub fn build_pk(link_id: String, intent_type: String, intent_id: String) -> String {
        format!("link#{}#type#{}#intent#{}", link_id, intent_type, intent_id)
    }

    pub fn new(link_id: String, intent_type: String, intent_id: String, ts: u64) -> Self {
        Self {
            pk: Self::build_pk(link_id.clone(), intent_type.clone(), intent_id.clone()),
            created_at: ts,
        }
    }

    pub fn split_pk(&self) -> (String, String, String) {
        let parts: Vec<&str> = self.pk.split('#').collect();
        let link_id = parts.get(1).unwrap_or(&"").to_string();
        let intent_type = parts.get(3).unwrap_or(&"").to_string();
        let intent_id = parts.get(5).unwrap_or(&"").to_string();

        (link_id, intent_type, intent_id)
    }
}

impl Storable for LinkIntent {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
