// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::nft::Nft;
use candid::{CandidType, Nat, Principal};
use serde::{Deserialize, Serialize};

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AddUserNftInput {
    pub nft: Nft,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserNftDto {
    pub user: Principal,
    pub nft: Nft,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct NftDto {
    pub collection_id: Principal,
    pub token_id: Nat,
}

impl From<Nft> for NftDto {
    fn from(nft: Nft) -> Self {
        NftDto {
            collection_id: nft.collection_id,
            token_id: nft.token_id,
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct GetUserNftInput {
    pub start: Option<u32>,
    pub limit: Option<u32>,
}
