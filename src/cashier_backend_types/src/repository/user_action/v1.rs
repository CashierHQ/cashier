// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;

#[derive(Clone, Debug, CandidType)]
#[storable]
pub struct UserAction {
    pub user_id: Principal,
    pub action_id: String,
}

#[storable]
pub enum UserActionCodec {
    V1(UserAction),
}

impl Codec<UserAction> for UserActionCodec {
    fn decode(source: Self) -> UserAction {
        match source {
            UserActionCodec::V1(link) => link,
        }
    }

    fn encode(dest: UserAction) -> Self {
        UserActionCodec::V1(dest)
    }
}