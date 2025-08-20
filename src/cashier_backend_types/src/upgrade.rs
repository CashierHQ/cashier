use candid::CandidType;
use canister_internal_settings::types::CanisterInternalSettings;
use ic_mple_log::service::LogServiceSettings;
use serde::Deserialize;

/// These are the arguments which are taken by the cashier_backend canister init fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CashierBackendInitData {
    #[serde(default)]
    pub log_settings: Option<LogServiceSettings>,
    #[serde(default)]
    pub canister_internal_settings: Option<CanisterInternalSettings>,
}
