// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;

#[derive(Clone, Debug, CandidType)]
#[storable]
pub struct UserLink {
    pub user_id: Principal,
    pub link_id: String,
}

#[storable]
pub enum UserLinkCodec {
    V1(UserLink),
}

impl Codec<UserLink> for UserLinkCodec {
    fn decode(source: Self) -> UserLink {
        match source {
            UserLinkCodec::V1(link) => link,
        }
    }

    fn encode(dest: UserLink) -> Self {
        UserLinkCodec::V1(dest)
    }
}
