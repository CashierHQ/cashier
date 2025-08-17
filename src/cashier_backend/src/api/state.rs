use std::{cell::RefCell, thread::LocalKey, time::Duration};

use cashier_backend_types::service::rate_limit::{
    RateLimitIdentifier, RateLimitPrecision, RateLimitStateStore, RateLimitStateStoreRunetime,
};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use rate_limit::{
    RateLimitService,
    algorithm::fixed_window_counter::FixedWindowCounterCore,
    service::{RateLimitState, ServiceSettings},
};

use crate::repositories::LOGGER_SERVICE_STORE;

thread_local! {
    // Thread-local storage for the rate limit state
    pub static RATE_LIMIT_STATE: RefCell<RateLimitStateStoreRunetime> = RefCell::new({
        RateLimitState::new(ServiceSettings::new(Duration::from_secs(60 * 60)))
    });
}

/// The state of the canister
pub struct CanisterState {
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub rate_limit_service: RateLimitService<
        RateLimitIdentifier,
        RateLimitStateStore,
        RateLimitPrecision,
        FixedWindowCounterCore,
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
