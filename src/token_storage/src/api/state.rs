use std::{cell::RefCell, thread::LocalKey};

use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};

use crate::repository::LOGGER_SERVICE_STORE;

/// The state of the canister
pub struct CanisterState {
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        CanisterState {
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
        }
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}