// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct RegistryStats {
    pub total_tokens: usize,
    pub total_enabled_default: usize,
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct UserTokens {
    pub enabled: usize,
    pub registry_tokens: usize,
    pub version: u64,
}
