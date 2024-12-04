use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Status {
    Created,
    Processing,
    Success,
    Failed,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ClaimActionParams {
    address: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum CreateActionParams {
    Claim(ClaimActionParams),
    None,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum ActionType {
    Create,
    Withdraw,
    Claim,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInput {
    pub action_type: ActionType,
    pub params: CreateActionParams,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Action {
    pub id: String,
    pub creator_id: String,
    pub link_id: String,
    pub status: Status,
    pub action_type: ActionType,
}

impl Action {
    pub fn new(
        id: String,
        creator_id: String,
        link_id: String,
        status: Status,
        action_type: ActionType,
    ) -> Self {
        Self {
            id,
            creator_id,
            link_id,
            status,
            action_type,
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::action::Action {
        crate::repositories::entities::action::Action::new(
            self.id.clone(),
            self.status.clone(),
            self.action_type.clone(),
            self.link_id.clone(),
            self.creator_id.clone(),
        )
    }

    pub fn from_persistence(action: crate::repositories::entities::action::Action) -> Self {
        Self {
            id: action.pk.split('#').last().unwrap().to_string(),
            creator_id: action.creator_id,
            link_id: action.link_id,
            status: action.status,
            action_type: action.action_type,
        }
    }
}
