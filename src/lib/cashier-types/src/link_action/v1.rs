// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone)]
#[storable]
pub struct LinkAction {
    pub link_id: String,
    pub action_id: String,
    pub action_type: String,
    pub user_id: String,
    pub link_user_state: Option<LinkUserState>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum LinkUserState {
    ChooseWallet,
    CompletedLink,
}

impl fmt::Display for LinkUserState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl LinkUserState {
    pub fn to_str(&self) -> &str {
        match self {
            LinkUserState::ChooseWallet => "User_state_choose_wallet",
            LinkUserState::CompletedLink => "User_state_completed_link",
        }
    }
}
