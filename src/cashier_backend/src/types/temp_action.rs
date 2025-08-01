// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::{
    action::v1::{Action, ActionState, ActionType},
    intent::v2::Intent,
    link_action::v1::LinkUserState,
};

#[derive(Debug, Clone)]
pub struct TemporaryAction {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: String,
    pub link_id: String,
    pub intents: Vec<Intent>,
    pub default_link_user_state: Option<LinkUserState>,
}

impl TemporaryAction {
    pub fn as_action(&self) -> Action {
        Action {
            id: self.id.clone(),
            r#type: self.r#type.clone(),
            state: self.state.clone(),
            creator: self.creator.clone(),
            link_id: self.link_id.clone(),
        }
    }
}
