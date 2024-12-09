use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UserAction {
    pub action_id: String,
    pub user_id: String,
    pub created_at: u64,
    pub action_type: String,
}

impl UserAction {
    pub fn new(user_id: String, action_id: String, action_type: String, created_at: u64) -> Self {
        Self {
            action_id,
            user_id,
            created_at,
            action_type,
        }
    }

    pub fn from_persistence(
        record: crate::repositories::entities::user_action::UserAction,
    ) -> Self {
        let (user_id, action_id) = record.split_pk();
        Self {
            action_id,
            user_id,
            created_at: record.created_at,
            action_type: record.action_type,
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::user_action::UserAction {
        crate::repositories::entities::user_action::UserAction::new(
            self.user_id.clone(),
            self.action_id.clone(),
            self.action_type.clone(),
            self.created_at,
        )
    }
}
