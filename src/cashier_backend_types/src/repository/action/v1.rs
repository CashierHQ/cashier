// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
#[storable]
pub struct Action {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: Principal,
    pub link_id: String,
}

#[storable]
pub enum ActionCodec {
    V1(Action),
}

impl Codec<Action> for ActionCodec {
    fn decode(source: Self) -> Action {
        match source {
            ActionCodec::V1(link) => link,
        }
    }

    fn encode(dest: Action) -> Self {
        ActionCodec::V1(dest)
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Display)]
pub enum ActionType {
    CreateLink,
    Withdraw,
    Use,
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Display)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}
