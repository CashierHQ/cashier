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
    /// Token fee cache TTL in nanoseconds (default: 168 hours / 7 days)
    #[serde(default)]
    pub token_fee_ttl_ns: Option<u64>,
    // Token standard cache TTL in nanoseconds (default: 168 hours / 7 days)
    #[serde(default)]
    pub token_standard_cache_ttl_ns: Option<u64>,
}

// Cross-canister ids (token_storage, gate_service) are NOT init/upgrade args: they live in stable
// `Settings` and are wired post-deploy via `admin_update_setting` (avoids stale/outdated args).
#[derive(Debug, Clone, CandidType, Deserialize)]
// These are the arguments which are taken by the cashier_backend canister upgrade fn
pub struct CashierBackendUpgradeData {
    /// Token fee cache TTL in nanoseconds (default: 168 hours / 7 days)
    #[serde(default)]
    pub token_fee_ttl_ns: Option<u64>,
    // Token standard cache TTL in nanoseconds (default: 168 hours / 7 days)
    #[serde(default)]
    pub token_standard_cache_ttl_ns: Option<u64>,
}
