use std::{cell::RefCell, thread::LocalKey, time::Duration};

use candid::Principal;
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use rate_limit::{
    RateLimitService,
    precision::Nanos,
    service::{RateLimitState, ServiceSettings},
};

use crate::repositories::LOGGER_SERVICE_STORE;

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub enum RateLimitIdentifier {
    UserPrincipal(Principal),
}

thread_local! {
    // Thread-local storage for the rate limit state
    pub static RATE_LIMIT_STATE: RefCell<RateLimitState<RateLimitIdentifier, Nanos>> = RefCell::new({
        RateLimitState::new(ServiceSettings::new(Duration::from_secs(60 * 60)))
    });
}

/// The state of the canister
pub struct CanisterState {
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub rate_limit_service: RateLimitService<
        RateLimitIdentifier,
        &'static LocalKey<RefCell<RateLimitState<RateLimitIdentifier, Nanos>>>,
        Nanos,
    >,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        CanisterState {
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            rate_limit_service: RateLimitService::new(&RATE_LIMIT_STATE),
        }
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
