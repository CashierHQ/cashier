// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repository::{action::v1::ActionType, link_action::v1::LinkAction};
use candid::Principal;
use cashier_macros::storable;
use ic_mple_structures::Codec;

pub struct UserLinkActionKey {
    pub user_id: Principal,
    pub link_id: String,
    pub action_type: ActionType,
}

impl UserLinkActionKey {
    pub fn to_str(&self) -> String {
        format!(
            "USER#{}#LINK#{}#TYPE#{}",
            self.user_id, self.link_id, self.action_type
        )
    }
}

#[storable]
pub enum UserLinkActionCodec {
    V1(Vec<LinkAction>),
}

impl Codec<Vec<LinkAction>> for UserLinkActionCodec {
    fn decode(source: Self) -> Vec<LinkAction> {
        match source {
            UserLinkActionCodec::V1(link) => link,
        }
    }

    fn encode(dest: Vec<LinkAction>) -> Self {
        UserLinkActionCodec::V1(dest)
    }
}
