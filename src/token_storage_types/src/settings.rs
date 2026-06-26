use candid::{CandidType, Principal};
use serde::Deserialize;

#[derive(Debug, Clone, Default, CandidType, Deserialize)]
pub struct UpdateSettingArgs {
    #[serde(default)]
    pub inspect_message_enabled: Option<bool>,
    #[serde(default)]
    pub ckbtc_minter_id: Option<Principal>,
    #[serde(default)]
    pub omnity_bitcoin_id: Option<Principal>,
}

#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize)]
pub struct SettingsDto {
    pub inspect_message_enabled: bool,
    pub ckbtc_minter_id: Principal,
    pub omnity_bitcoin_id: Principal,
}
