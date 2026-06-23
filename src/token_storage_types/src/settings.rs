use candid::{CandidType, Principal};
use serde::Deserialize;

/// Partial settings update: every field is optional; only `Some` fields are applied by
/// `admin_update_setting`. Shared between the canister and clients.
#[derive(Debug, Clone, Default, CandidType, Deserialize)]
pub struct UpdateSettingArgs {
    #[serde(default)]
    pub inspect_message_enabled: Option<bool>,
    #[serde(default)]
    pub ckbtc_minter_id: Option<Principal>,
    #[serde(default)]
    pub omnity_bitcoin_id: Option<Principal>,
}

/// Read-back view of canister settings returned by `admin_get_setting`.
#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize)]
pub struct SettingsDto {
    pub inspect_message_enabled: bool,
    pub ckbtc_minter_id: Principal,
    pub omnity_bitcoin_id: Principal,
}
