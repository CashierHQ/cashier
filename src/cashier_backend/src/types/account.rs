// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

pub type Subaccount = serde_bytes::ByteBuf;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Subaccount>,
}

impl Account {
    pub fn new(owner: Principal, subaccount: Option<Subaccount>) -> Self {
        Self { owner, subaccount }
    }

    pub fn from_link_id(owner: Principal, link_id: String) -> Self {
        let subaccount_bytes = link_id.into_bytes();
        let subaccount = Some(subaccount_bytes.into());

        Self { owner, subaccount }
    }
}
