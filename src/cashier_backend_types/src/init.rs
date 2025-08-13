use candid::CandidType;
use ic_mple_log::service::LogServiceSettings;
use serde::Deserialize;

/// These are the arguments which are taken by the cashier_backend canister init fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CashierBackendCanisterInitData {
    #[serde(default)]
    pub log_settings: Option<LogServiceSettings>,
}