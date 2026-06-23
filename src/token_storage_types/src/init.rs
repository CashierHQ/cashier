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
    /// Omnity Bitcoin canister id
    pub omnity_bitcoin_id: Principal,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct TokenStorageUpgradeData {
    /// CKBTC minter canister id (optional on upgrade: omit to keep the existing stable value)
    #[serde(default)]
    pub ckbtc_minter_id: Option<Principal>,
    /// Omnity Bitcoin canister id (optional on upgrade: omit to keep the existing stable value)
    #[serde(default)]
    pub omnity_bitcoin_id: Option<Principal>,
    /// Optional tokens to upsert during upgrade
    #[serde(default)]
    pub tokens: Option<Vec<RegistryToken>>,
}
