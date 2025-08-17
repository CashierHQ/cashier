use std::{cell::RefCell, rc::Rc, thread::LocalKey, time::Duration};

use cashier_backend_types::service::rate_limit::{
    RateLimitIdentifier, RateLimitPrecision, RateLimitStateStore, RateLimitStateStoreRunetime,
};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use rate_limit::{
    RateLimitService,
    algorithm::fixed_window_counter::FixedWindowCounterCore,
    service::{RateLimitState, ServiceSettings},
};

use crate::{
    repositories::{LOGGER_SERVICE_STORE, ThreadlocalRepositories},
    services::{
        action::ActionService,
        link::service::LinkService,
        request_lock::RequestLockService,
        transaction_manager::{service::TransactionManagerService, validate::ValidateService},
        user::v2::UserService,
    },
    utils::runtime::RealIcEnvironment,
};

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
    pub action_service: ActionService<ThreadlocalRepositories>,
    pub link_service: LinkService<RealIcEnvironment, ThreadlocalRepositories>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub transaction_manager_service:
        TransactionManagerService<RealIcEnvironment, ThreadlocalRepositories>,
    pub user_service: UserService<ThreadlocalRepositories>,
    pub validate_service: ValidateService<ThreadlocalRepositories>,
    pub env: RealIcEnvironment,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        let repo = Rc::new(ThreadlocalRepositories);
        let env = RealIcEnvironment::new();
        CanisterState {
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            rate_limit_service: RateLimitService::new(&RATE_LIMIT_STATE),
            action_service: ActionService::new(&repo),
            request_lock_service: RequestLockService::new(&repo),
            user_service: UserService::new(&repo),
            validate_service: ValidateService::new(&repo),
            link_service: LinkService::new(repo.clone(), env.clone()),
            transaction_manager_service: TransactionManagerService::new(repo, env.clone()),
            env,
        }
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
