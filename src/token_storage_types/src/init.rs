use candid::CandidType;
use ic_mple_log::service::LogServiceSettings;
use serde::Deserialize;

/// These are the arguments which are taken by the token_storage canister init fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TokenStorageCanisterInitData {
    #[serde(default)]
    pub log_settings: Option<LogServiceSettings>,
}