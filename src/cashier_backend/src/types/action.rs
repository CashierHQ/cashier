use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum ActionStatus {
    Created,
    Processing,
    Success,
    Failed,
    Timeout,
}

impl ActionStatus {
    pub fn to_string(&self) -> String {
        match self {
            ActionStatus::Created => "Created".to_string(),
            ActionStatus::Processing => "Processing".to_string(),
            ActionStatus::Success => "Success".to_string(),
            ActionStatus::Failed => "Failed".to_string(),
            ActionStatus::Timeout => "Timeout".to_string(),
        }
    }

    pub fn from_string(status: &str) -> ActionStatus {
        match status {
            "Created" => ActionStatus::Created,
            "Processing" => ActionStatus::Processing,
            "Success" => ActionStatus::Success,
            "Failed" => ActionStatus::Failed,
            "Timeout" => ActionStatus::Timeout,
            _ => ActionStatus::Created,
        }
    }
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

impl ActionType {
    pub fn to_string(&self) -> String {
        match self {
            ActionType::Create => "Create".to_string(),
            ActionType::Withdraw => "Withdraw".to_string(),
            ActionType::Claim => "Claim".to_string(),
        }
    }

    pub fn from_string(action_type: &str) -> ActionType {
        match action_type {
            "Create" => ActionType::Create,
            "Withdraw" => ActionType::Withdraw,
            "Claim" => ActionType::Claim,
            _ => ActionType::Create,
        }
    }
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
    pub status: String,
    pub action_type: String,
}

impl Action {
    pub fn new(
        id: String,
        creator_id: String,
        link_id: String,
        status: String,
        action_type: String,
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
            self.status.clone().to_string(),
            self.action_type.clone().to_string(),
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
