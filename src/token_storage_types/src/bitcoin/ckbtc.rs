// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;
use serde::Deserialize;

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BtcAddress {
    pub address: String,
}

#[storable]
pub enum BtcAddressCodec {
    V1(BtcAddress),
}

impl Codec<BtcAddress> for BtcAddressCodec {
    fn decode(source: Self) -> BtcAddress {
        match source {
            BtcAddressCodec::V1(address) => address,
        }
    }

    fn encode(dest: BtcAddress) -> Self {
        BtcAddressCodec::V1(dest)
    }
}

#[derive(CandidType, Deserialize)]
pub struct GetBtcAddressArg {
    pub owner: Option<Principal>,
    pub subaccount: Option<serde_bytes::ByteBuf>,
}
