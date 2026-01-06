use std::{cell::RefCell, thread::LocalKey};

use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};

use crate::{
    icrc7::ic_icrc7_validator::{self, ICIcrc7Validator},
    repository::{AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories},
    services::{
        auth::{AuthService, AuthServiceStorage},
        settings::SettingsService,
        token_registry::TokenRegistryService,
        user_nft::UserNftService,
        user_preference::UserPreferenceService,
        user_token::UserTokenService,
    },
};

/// The state of the canister
pub struct CanisterState {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub token_registry: TokenRegistryService<ThreadlocalRepositories>,
    pub user_preference: UserPreferenceService<ThreadlocalRepositories>,
    pub user_token: UserTokenService<ThreadlocalRepositories>,
    pub user_nft: UserNftService<ThreadlocalRepositories, ICIcrc7Validator>,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        let repo = ThreadlocalRepositories;
        let ic_icrc7_validator = ICIcrc7Validator;

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            settings: SettingsService::new(&repo),
            token_registry: TokenRegistryService::new(&repo),
            user_preference: UserPreferenceService::new(&repo),
            user_token: UserTokenService::new(&repo),
            user_nft: UserNftService::new(&repo, ic_icrc7_validator),
        }
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
