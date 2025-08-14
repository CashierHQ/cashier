use std::{cell::RefCell, thread::LocalKey, time::Duration};

use candid::Principal;
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use rate_limit::{
    RateLimitConfigService,
    service::{PrecisionType, RateLimitState, ServiceSettings},
};

use crate::repositories::LOGGER_SERVICE_STORE;

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub enum RateLimitIdentifier {
    UserPrincipal(Principal),
}

thread_local! {
    // Thread-local storage for the rate limit state
    pub static RATE_LIMIT_STATE: RefCell<RateLimitState<RateLimitIdentifier>> = RefCell::new({
        RateLimitState::new_with_settings(
            ServiceSettings::with_delete_threshold_and_precision(
                60 * 60 * 1_000_000_000, // 1 hour cleanup threshold in nanoseconds
                PrecisionType::Nanos
            )
        )
    });
}

/// The state of the canister
pub struct CanisterState {
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub rate_limit_service: RateLimitConfigService<
        RateLimitIdentifier,
        &'static LocalKey<RefCell<RateLimitState<RateLimitIdentifier>>>,
    >,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        CanisterState {
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            rate_limit_service: RateLimitConfigService::new(&RATE_LIMIT_STATE),
        }
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
