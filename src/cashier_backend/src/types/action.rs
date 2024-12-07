use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}

impl ActionState {
    pub fn to_string(&self) -> String {
        match self {
            ActionState::Created => "Action_state_created".to_string(),
            ActionState::Processing => "Action_state_processing".to_string(),
            ActionState::Success => "Action_state_success".to_string(),
            ActionState::Fail => "Action_state_fail".to_string(),
        }
    }

    pub fn from_string(status: &str) -> Result<ActionState, String> {
        match status {
            "Action_state_created" => Ok(ActionState::Created),
            "Action_state_processing" => Ok(ActionState::Processing),
            "Action_state_success" => Ok(ActionState::Success),
            "Action_state_fail" => Ok(ActionState::Fail),
            _ => Err("Invalid action state".to_string()),
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

    pub fn from_string(action_type: &str) -> Result<ActionType, String> {
        match action_type {
            "Create" => Ok(ActionType::Create),
            "Withdraw" => Ok(ActionType::Withdraw),
            "Claim" => Ok(ActionType::Claim),
            _ => Err("Invalid action type".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInput {
    pub action_type: String,
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
