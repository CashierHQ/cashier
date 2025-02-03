use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::intent::IntentType;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkIntent {
    pub link_id: String,
    pub intent_type: IntentType,
    pub intent_id: String,
    pub created_at: u64,
}

impl LinkIntent {
    pub fn new(
        link_id: String,
        intent_type: IntentType,
        intent_id: String,
        created_at: u64,
    ) -> LinkIntent {
        LinkIntent {
            link_id,
            intent_type,
            intent_id,
            created_at,
        }
    }
}
