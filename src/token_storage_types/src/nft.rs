// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;
use std::collections::HashSet;

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct Nft {
    pub collection_id: Principal,
    pub token_id: Nat,
}

#[storable]
pub enum UserNftCodec {
    V1(HashSet<Nft>),
}

impl Codec<HashSet<Nft>> for UserNftCodec {
    fn decode(source: Self) -> HashSet<Nft> {
        match source {
            UserNftCodec::V1(nft) => nft,
        }
    }

    fn encode(dest: HashSet<Nft>) -> Self {
        UserNftCodec::V1(dest)
    }
}
