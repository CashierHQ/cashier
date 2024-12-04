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

    pub fn from_persistent(record: crate::repositories::entities::user_link::UserLink) -> Self {
        let (user_id, link_id) = record.split_pk();
        Self {
            link_id,
            creator_id: user_id,
            created_at: record.created_at,
        }
    }

    pub fn to_persistent(&self) -> crate::repositories::entities::user_link::UserLink {
        crate::repositories::entities::user_link::UserLink::new(
            self.creator_id.clone(),
            self.link_id.clone(),
            self.created_at,
        )
    }
}
