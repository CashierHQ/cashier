// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{self, CandidType, Deserialize, Principal};
pub type SubAccount = serde_bytes::ByteBuf;

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<SubAccount>,
}

pub type Icrc7OwnerOfResponse = Vec<Option<Account>>;
