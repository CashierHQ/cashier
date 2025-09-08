use candid::{CandidType, Principal};
use ic_mple_log::service::LogServiceSettings;
use serde::Deserialize;

/// These are the arguments which are taken by the cashier_backend canister init fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CashierBackendInitData {
    #[serde(default)]
    pub log_settings: Option<LogServiceSettings>,
    /// Owner of the canister
    pub owner: Principal,
    /// The canister id of the gate service canister
    pub gate_service_canister_id: Principal,
}

/// These are the arguments which are taken by the cashier_backend canister post_upgrade fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CashierBackendUpgradeData {
    /// The canister id of the gate service canister
    pub gate_service_canister_id: Principal,
}
