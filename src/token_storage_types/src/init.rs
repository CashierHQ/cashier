use candid::{CandidType, Principal};
use ic_mple_log::service::LogServiceSettings;
use serde::Deserialize;

use crate::token::RegistryToken;

/// These are the arguments which are taken by the token_storage canister init fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TokenStorageInitData {
    #[serde(default)]
    pub log_settings: Option<LogServiceSettings>,
    /// Owner of the canister
    pub owner: Principal,
    /// List of tokens to be registered
    #[serde(default)]
    pub tokens: Option<Vec<RegistryToken>>,
    /// CKBTC minter canister id
    pub ckbtc_minter_id: Principal,
}
