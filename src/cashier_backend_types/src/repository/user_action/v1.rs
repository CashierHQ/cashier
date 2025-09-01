// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;

#[derive(Clone, Debug, CandidType)]
#[storable]
pub struct UserAction {
    pub user_id: Principal,
    pub action_id: String,
}
