// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


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
    pub link_id: String,
}

impl Default for Action {
    fn default() -> Self {
        Action {
            id: "".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: "".to_string(),
            link_id: "".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum ActionType {
    CreateLink,
    Withdraw,
    Use,
    // deprecated
    Claim,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}

impl ActionType {
    pub fn to_str(&self) -> &str {
        match self {
            ActionType::Use => "Use",
            ActionType::CreateLink => "CreateLink",
            ActionType::Withdraw => "Withdraw",
            ActionType::Claim => "Use",
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
            "Use" => Ok(ActionType::Use),
            "Claim" => Ok(ActionType::Use),
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
