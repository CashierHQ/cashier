// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;

#[derive(Clone, Debug, Default, CandidType, PartialEq)]
#[storable]
pub struct UserWallet {
    pub user_id: String,
}
