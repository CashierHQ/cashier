// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_macros::storable;
use gate_service_types::Gate;
use ic_mple_structures::Codec;

/// Maps a link to all gates associated with it, including their metadata (key is redacted).
/// Stored locally so `get_gates_for_link` never needs an inter-canister call.
/// One link can have multiple gates (future scalability).
#[derive(Debug, Clone)]
#[storable]
pub struct LinkGate {
    pub link_id: String,
    pub gates: Vec<Gate>,
}

#[storable]
pub enum LinkGateCodec {
    V1(LinkGate),
}

impl Codec<LinkGate> for LinkGateCodec {
    fn decode(source: Self) -> LinkGate {
        match source {
            LinkGateCodec::V1(v) => v,
        }
    }

    fn encode(dest: LinkGate) -> Self {
        LinkGateCodec::V1(dest)
    }
}
