// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_shared::types::{
    Action as ActionShared, Link as LinkShared, LinkType as LinkTypeShared,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkInputV3 {
    pub title: String,
    pub link_type: LinkTypeShared,
    pub max_use: u64,
    pub action: ActionShared,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkResponseV3 {
    pub link: LinkShared,
    pub action: ActionShared,
}
