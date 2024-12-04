use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::action::ActionType;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkAction {
    pub link_id: String,
    pub action_type: ActionType,
    pub action_id: String,
    pub created_at: u64,
}

impl LinkAction {
    pub fn new(
        link_id: String,
        action_type: ActionType,
        action_id: String,
        created_at: u64,
    ) -> LinkAction {
        LinkAction {
            link_id,
            action_type,
            action_id,
            created_at,
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::link_action::LinkAction {
        let type_str = self.action_type.to_string();

        crate::repositories::entities::link_action::LinkAction::new(
            self.link_id.clone(),
            type_str,
            self.action_id.clone(),
            self.created_at,
        )
    }

    pub fn from_persistence(
        link_action: crate::repositories::entities::link_action::LinkAction,
    ) -> LinkAction {
        let (link_id, action_type_str, action_id) = link_action.split_pk();

        let action_type = ActionType::from_string(&action_type_str);

        LinkAction {
            link_id,
            action_type,
            action_id,
            created_at: link_action.created_at,
        }
    }
}
