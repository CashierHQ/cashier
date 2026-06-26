// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use serde::Deserialize;

/// Principal specific permission
#[derive(
    Debug, Clone, CandidType, Deserialize, Hash, PartialEq, Eq, PartialOrd, Ord, serde::Serialize,
)]
pub enum Permission {
    /// Admin of the canister
    Admin,
    /// Allow to create a new gate
    GateCreate,
}
