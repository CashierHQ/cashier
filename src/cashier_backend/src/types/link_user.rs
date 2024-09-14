use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkUser {
    pub link_id: String,
    pub creator_id: String,
    pub create_at: u64,
}

impl LinkUser {
    pub fn from_persistent(key: String, value: u64) -> Self {
        let mut parts = key.split('#');
        let creator_id = parts.next().unwrap().to_string();
        let link_id = parts.next().unwrap().to_string();
        Self {
            link_id,
            creator_id,
            create_at: value,
        }
    }
}
