// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Deserialize, Principal};

#[derive(CandidType, Deserialize)]
pub enum LifecycleArg {
    UpgradeArg(UpgradeArg),
    InitArg(InitArg),
}

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    pub maintainers: Vec<Principal>,
    pub mode: Mode,
    pub minter_id: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct UpgradeArg {
    pub maintainers: Option<Vec<Principal>>,
    pub mode: Option<Mode>,
    pub minter_id: Option<Principal>,
}

#[derive(CandidType, Deserialize)]
pub enum Mode {
    RejectAll,
    Normal,
    AcceptAll,
}

#[derive(CandidType, Deserialize)]
pub struct SetApiKeyArg {
    pub api_key: String,
}
