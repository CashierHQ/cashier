// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;
use ic_mple_structures::Codec;

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeAddress {
    pub btc_address: String,
    pub rune_address: Option<String>,
}

#[storable]
pub enum BridgeAddressCodec {
    V1(BridgeAddress),
}

impl Codec<BridgeAddress> for BridgeAddressCodec {
    fn decode(source: Self) -> BridgeAddress {
        match source {
            BridgeAddressCodec::V1(address) => address,
        }
    }

    fn encode(dest: BridgeAddress) -> Self {
        BridgeAddressCodec::V1(dest)
    }
}
