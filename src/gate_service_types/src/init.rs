// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::auth::Permission;
use candid::{CandidType, Principal};
use ic_mple_log::service::LogServiceSettings;
use serde::Deserialize;
use std::collections::HashMap;

/// These are the arguments which are taken by the gate_service canister init fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GateServiceInitData {
    #[serde(default)]
    pub log_settings: Option<LogServiceSettings>,
    /// The owner of the canister
    pub owner: Principal,
    /// permissions matrix
    pub permissions: Option<HashMap<Principal, Vec<Permission>>>,
}
