use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Action {
    pub id: String,
    pub action_type: String,
    pub state: ActionState,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
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
