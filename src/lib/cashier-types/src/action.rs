use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone)]
#[storable]
pub struct Action {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum ActionType {
    CreateLink,
    Withdraw,
    Claim,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}

#[derive(Debug, Clone)]
#[storable]
pub struct ActionIntent {
    pub action_id: String,
    pub intent_id: String,
}

impl ActionType {
    pub fn to_str(&self) -> &str {
        match self {
            ActionType::Claim => "Claim",
            ActionType::CreateLink => "CreateLink",
            ActionType::Withdraw => "Withdraw",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for ActionType {
    type Err = ();

    fn from_str(input: &str) -> Result<ActionType, Self::Err> {
        match input {
            "Claim" => Ok(ActionType::Claim),
            "CreateLink" => Ok(ActionType::CreateLink),
            "Withdraw" => Ok(ActionType::Withdraw),
            _ => Err(()),
        }
    }
}

impl ActionState {
    pub fn to_str(&self) -> &str {
        match self {
            ActionState::Created => "Action_state_created",
            ActionState::Processing => "Action_state_processing",
            ActionState::Success => "Action_state_success",
            ActionState::Fail => "Action_state_fail",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for ActionState {
    type Err = ();

    fn from_str(input: &str) -> Result<ActionState, Self::Err> {
        match input {
            "Action_state_created" => Ok(ActionState::Created),
            "Action_state_processing" => Ok(ActionState::Processing),
            "Action_state_success" => Ok(ActionState::Success),
            "Action_state_fail" => Ok(ActionState::Fail),
            _ => Err(()),
        }
    }
}
