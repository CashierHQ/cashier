// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
#[storable]
pub struct ActionIntent {
    pub action_id: String,
    pub intent_id: String,
}

impl ActionType {
    pub fn to_str(&self) -> &str {
        match self {
            ActionType::Use => "Use",
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
            "Use" => Ok(ActionType::Use),
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
