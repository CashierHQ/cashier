// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use derive_more::Display;
use serde::{Deserialize, Serialize};

use crate::repository::action::v1::ActionType;

#[derive(Debug, Clone)]
#[storable]
pub struct LinkAction {
    pub link_id: String,
    pub action_id: String,
    pub action_type: ActionType,
    pub user_id: Principal,
    pub link_user_state: Option<LinkUserState>,
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Display)]
pub enum LinkUserState {
    ChooseWallet,
    CompletedLink,
}
