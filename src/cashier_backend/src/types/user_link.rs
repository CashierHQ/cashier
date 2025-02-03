use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UserLink {
    pub link_id: String,
    pub creator_id: String,
    pub created_at: u64,
}

impl UserLink {
    pub fn new(creator_id: String, link_id: String, created_at: u64) -> Self {
        Self {
            link_id,
            creator_id,
            created_at,
        }
    }
}
