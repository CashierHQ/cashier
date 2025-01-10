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

    pub fn from_persistence(
        record: crate::repositories::entities::user_intent::UserIntent,
    ) -> Self {
        let (user_id, intent_id) = record.split_pk();
        Self {
            intent_id,
            user_id,
            created_at: record.created_at,
            intent_type: record.intent_type,
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::user_intent::UserIntent {
        crate::repositories::entities::user_intent::UserIntent::new(
            self.user_id.clone(),
            self.intent_id.clone(),
            self.intent_type.clone(),
            self.created_at,
        )
    }
}
