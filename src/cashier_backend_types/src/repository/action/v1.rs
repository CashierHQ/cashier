// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repository::intent::v1::Intent;
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
    Receive,
    Send,
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Display)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}

// --- From<cashier_shared> impls ---

impl From<cashier_shared::ActionType> for ActionType {
    fn from(t: cashier_shared::ActionType) -> Self {
        match t {
            cashier_shared::ActionType::CreateLink => ActionType::CreateLink,
            cashier_shared::ActionType::Withdraw => ActionType::Withdraw,
            cashier_shared::ActionType::Send => ActionType::Send,
            cashier_shared::ActionType::Receive => ActionType::Receive,
        }
    }
}

impl ActionType {
    pub fn into_generated(&self) -> cashier_shared::ActionType {
        match self {
            ActionType::CreateLink => cashier_shared::ActionType::CreateLink,
            ActionType::Withdraw => cashier_shared::ActionType::Withdraw,
            ActionType::Send => cashier_shared::ActionType::Send,
            ActionType::Receive => cashier_shared::ActionType::Receive,
        }
    }
}

impl From<cashier_shared::ActionState> for ActionState {
    fn from(state: cashier_shared::ActionState) -> Self {
        match state {
            cashier_shared::ActionState::Created => ActionState::Created,
            cashier_shared::ActionState::Processing => ActionState::Processing,
            cashier_shared::ActionState::Success => ActionState::Success,
            cashier_shared::ActionState::Failed => ActionState::Fail,
        }
    }
}

impl ActionState {
    pub fn into_generated(&self) -> cashier_shared::ActionState {
        match self {
            ActionState::Created => cashier_shared::ActionState::Created,
            ActionState::Processing => cashier_shared::ActionState::Processing,
            ActionState::Success => cashier_shared::ActionState::Success,
            ActionState::Fail => cashier_shared::ActionState::Failed,
        }
    }
}

impl Action {
    /// Create repo Action from `cashier_shared::Action`.
    ///
    /// # Arguments
    /// * `value` - Source generated Action
    /// * `link_id` - Associated link ID (not stored in generated type)
    ///
    /// # Returns
    /// Repo Action with all fields explicitly set
    ///
    /// # Note
    /// `value.intents` are NOT stored — use ActionIntent junction separately
    pub fn from_generated(value: cashier_shared::Action, link_id: String) -> Self {
        Action {
            id: value.id,
            r#type: value.action_type.into(),
            state: value.action_state.into(),
            creator: value.creator,
            link_id,
        }
    }

    /// Convert repo Action to `cashier_shared::Action`.
    ///
    /// # Arguments
    /// * `creator_address_type` - Address type of creator (not stored in repo)
    /// * `intents` - Pre-converted intents fetched via ActionIntent junction
    ///
    /// # Returns
    /// `cashier_shared::Action` with all fields populated
    pub fn into_generated(&self, intents: Vec<Intent>) -> cashier_shared::Action {
        let creator_address_type: cashier_shared::AddressType = {
            match self.r#type {
                ActionType::CreateLink => cashier_shared::AddressType::Creator,
                ActionType::Withdraw => cashier_shared::AddressType::Creator,
                ActionType::Send => cashier_shared::AddressType::User,
                ActionType::Receive => cashier_shared::AddressType::User,
            }
        };

        cashier_shared::Action {
            id: self.id.clone(),
            creator: self.creator,
            creator_address_type,
            action_type: self.r#type.clone().into_generated(),
            intents: intents
                .into_iter()
                .map(|intent| intent.into_generated(self.clone()))
                .collect(),
            action_state: self.state.clone().into_generated(),
        }
    }
}
