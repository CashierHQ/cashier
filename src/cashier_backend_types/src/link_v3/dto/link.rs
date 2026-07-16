// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_shared::types::{
    Action as ActionShared, Link as LinkShared, LinkType as LinkTypeShared,
};
use gate_service_types::{Gate, GateForUser, GateKey};
use serde::{Deserialize, Serialize};

use crate::{dto::action::Icrc112Requests, service::link::PaginateResult};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkInputV3 {
    pub title: String,
    pub link_type: LinkTypeShared,
    pub max_use: u64,
    pub action: ActionShared,
    pub gate_keys: Option<Vec<GateKey>>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkResponseV3 {
    pub link: LinkShared,
    pub action: ActionShared,
    pub icrc112_requests: Option<Icrc112Requests>,
    pub gates: Vec<Gate>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct DisableLinkResponseV3 {
    pub link: LinkShared,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct SyncAssetBalanceCacheResponseV3 {
    pub link: LinkShared,
}

pub type GetLinksResponseV3 = PaginateResult<LinkShared>;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetLinkResponseV3 {
    pub link: LinkShared,
    pub actions: Vec<ActionShared>,
    pub icrc112_requests: Option<Icrc112Requests>,
}

/// Extended link details response that includes gate information.
#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetLinkDetailsResponseV3 {
    pub link: LinkShared,
    pub actions: Vec<ActionShared>,
    pub icrc112_requests: Option<Icrc112Requests>,
    /// Gate metadata and per-user open status for each gate on the link.
    pub gates: Vec<GateForUser>,
}
