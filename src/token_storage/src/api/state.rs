use std::{cell::RefCell, thread::LocalKey};

use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};

use crate::{repository::{ThreadlocalRepositories, LOGGER_SERVICE_STORE}, services::{token_registry::TokenRegistryService, user_preference::UserPreferenceService, user_token::UserTokenService}};

/// The state of the canister
pub struct CanisterState {
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub token_registry: TokenRegistryService<ThreadlocalRepositories>,
    pub user_preference: UserPreferenceService<ThreadlocalRepositories>,
    pub user_token: UserTokenService<ThreadlocalRepositories>,
    
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        let repo = ThreadlocalRepositories;
        CanisterState {
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            token_registry: TokenRegistryService::new(&repo),
            user_preference: UserPreferenceService::new(&repo),
            user_token: UserTokenService::new(&repo),
        }
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
