// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone)]
#[storable]
pub struct Action {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: Principal,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum ActionType {
    CreateLink,
    Withdraw,
    Use,
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
        }
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

impl fmt::Display for ActionType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl fmt::Display for ActionState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}
