use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UserIntent {
    pub intent_id: String,
    pub user_id: String,
    pub created_at: u64,
    pub intent_type: String,
}

impl UserIntent {
    pub fn new(user_id: String, intent_id: String, intent_type: String, created_at: u64) -> Self {
        Self {
            intent_id,
            user_id,
            created_at,
            intent_type,
        }
    }
}
