// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
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

#[storable]
pub enum LinkActionCodec {
    V1(LinkAction),
}

impl Codec<LinkAction> for LinkActionCodec {
    fn decode(source: Self) -> LinkAction {
        match source {
            LinkActionCodec::V1(link) => link,
        }
    }

    fn encode(dest: LinkAction) -> Self {
        LinkActionCodec::V1(dest)
    }
}


#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Display)]
pub enum LinkUserState {
    // user_state_address
    Address,
    // user_state_gate_closed
    GateClosed,
    // user_state_gate_opened
    GateOpened,
    // user_state_completed_link
    CompletedLink,
}
