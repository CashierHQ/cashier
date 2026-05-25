// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_macros::storable;
use gate_service_types::GateStatus;
use ic_mple_structures::Codec;

/// Cached record of whether a specific user has opened a specific gate for a link.
/// Key: "LINK#{link_id}#USER#{user_id}#GATE#{gate_id}"
#[derive(Debug, Clone)]
#[storable]
pub struct LinkGateUserStatus {
    pub link_id: String,
    pub user_id: Principal,
    pub gate_id: String,
    pub status: GateStatus,
}

#[storable]
pub enum LinkGateUserStatusCodec {
    V1(LinkGateUserStatus),
}

impl Codec<LinkGateUserStatus> for LinkGateUserStatusCodec {
    fn decode(source: Self) -> LinkGateUserStatus {
        match source {
            LinkGateUserStatusCodec::V1(v) => v,
        }
    }

    fn encode(dest: LinkGateUserStatus) -> Self {
        LinkGateUserStatusCodec::V1(dest)
    }
}

/// Build the composite storage key for a (link, user, gate) triplet.
pub fn link_gate_user_status_key(link_id: &str, user_id: Principal, gate_id: &str) -> String {
    format!("LINK#{link_id}#USER#{user_id}#GATE#{gate_id}")
}
