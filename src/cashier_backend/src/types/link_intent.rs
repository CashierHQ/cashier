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

    pub fn to_persistence(&self) -> crate::repositories::entities::link_intent::LinkIntent {
        let type_str = self.intent_type.to_string();

        crate::repositories::entities::link_intent::LinkIntent::new(
            self.link_id.clone(),
            type_str,
            self.intent_id.clone(),
            self.created_at,
        )
    }

    pub fn from_persistence(
        link_intent: crate::repositories::entities::link_intent::LinkIntent,
    ) -> LinkIntent {
        let (link_id, intent_type_str, intent_id) = link_intent.split_pk();

        let intent_type = IntentType::from_string(&intent_type_str).unwrap();

        LinkIntent {
            link_id,
            intent_type,
            intent_id,
            created_at: link_intent.created_at,
        }
    }
}
