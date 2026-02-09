// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_macros::storable;
use cashier_shared::types::{
    Action as ActionShared, ActionState as ActionStateShared, ActionType as ActionTypeShared,
};
use ic_mple_structures::Codec;

use crate::repository::{
    action::v1::{ActionState, ActionType},
    common::AddressTypeV3,
    intent::v3::IntentV3,
};

#[derive(Debug, Clone, PartialEq, Eq)]
#[storable]
pub struct ActionV3 {
    pub id: String,
    pub action_type: ActionType,
    pub state: ActionState,
    pub creator: Principal,
    pub creator_address_type: AddressTypeV3,
    pub link_id: Option<String>,
}

#[storable]
pub enum ActionCodecV3 {
    V1(ActionV3),
}

impl Codec<ActionV3> for ActionCodecV3 {
    fn decode(source: Self) -> ActionV3 {
        match source {
            ActionCodecV3::V1(link) => link,
        }
    }

    fn encode(dest: ActionV3) -> Self {
        ActionCodecV3::V1(dest)
    }
}

impl From<ActionShared> for ActionV3 {
    fn from(action: ActionShared) -> Self {
        ActionV3 {
            id: action.id,
            action_type: ActionType::from(action.action_type),
            state: ActionState::from(action.action_state),
            creator: action.creator,
            creator_address_type: AddressTypeV3::from(action.creator_address_type),
            link_id: action.link_id,
        }
    }
}

impl ActionV3 {
    pub fn to_shared(&self, intents: Vec<IntentV3>) -> ActionShared {
        let intent_shared = intents.into_iter().map(|i| i.to_shared()).collect();
        ActionShared {
            id: self.id.clone(),
            action_type: self.action_type.to_shared(),
            intents: intent_shared,
            action_state: self.state.to_shared(),
            creator: self.creator,
            creator_address_type: self.creator_address_type.to_shared(),
            link_id: self.link_id.clone(),
        }
    }
}

impl From<ActionTypeShared> for ActionType {
    fn from(t: ActionTypeShared) -> Self {
        match t {
            ActionTypeShared::CreateLink => ActionType::CreateLink,
            ActionTypeShared::Withdraw => ActionType::Withdraw,
            ActionTypeShared::Send => ActionType::Send,
            ActionTypeShared::Receive => ActionType::Receive,
        }
    }
}

impl ActionType {
    pub fn to_shared(&self) -> ActionTypeShared {
        match self {
            ActionType::CreateLink => ActionTypeShared::CreateLink,
            ActionType::Withdraw => ActionTypeShared::Withdraw,
            ActionType::Send => ActionTypeShared::Send,
            ActionType::Receive => ActionTypeShared::Receive,
        }
    }
}

impl From<ActionStateShared> for ActionState {
    fn from(state: ActionStateShared) -> Self {
        match state {
            ActionStateShared::Created => ActionState::Created,
            ActionStateShared::Processing => ActionState::Processing,
            ActionStateShared::Success => ActionState::Success,
            ActionStateShared::Fail => ActionState::Fail,
        }
    }
}

impl ActionState {
    pub fn to_shared(&self) -> ActionStateShared {
        match self {
            ActionState::Created => ActionStateShared::Created,
            ActionState::Processing => ActionStateShared::Processing,
            ActionState::Success => ActionStateShared::Success,
            ActionState::Fail => ActionStateShared::Fail,
        }
    }
}
