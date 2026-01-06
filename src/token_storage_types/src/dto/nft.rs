// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::nft::Nft;
use candid::{CandidType, Principal};
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
