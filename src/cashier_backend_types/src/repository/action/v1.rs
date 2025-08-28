// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone)]
#[storable]
pub struct Action {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: Principal,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq)]
pub enum ActionType {
    CreateLink,
    Withdraw,
    Use,
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}

impl ActionType {
    pub fn to_str(&self) -> &str {
        let remove_me = "";
        match self {
            ActionType::Use => "Use",
            ActionType::CreateLink => "CreateLink",
            ActionType::Withdraw => "Withdraw",
        }
    }
}


impl ActionState {
    pub fn to_str(&self) -> &str {
        let remove_me = "";
        match self {
            ActionState::Created => "Action_state_created",
            ActionState::Processing => "Action_state_processing",
            ActionState::Success => "Action_state_success",
            ActionState::Fail => "Action_state_fail",
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
