use std::{cell::RefCell, rc::Rc, thread::LocalKey};

use cashier_backend_types::service::rate_limit::{
    RateLimitIdentifier, RateLimitPrecision, RateLimitStateStore,
};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use rate_limit::{RateLimitService, algorithm::fixed_window_counter::FixedWindowCounterCore};

use crate::{
    repositories::{LOGGER_SERVICE_STORE, RATE_LIMIT_STATE, ThreadlocalRepositories},
    services::{
        action::ActionService,
        link::service::LinkService,
        request_lock::RequestLockService,
        transaction_manager::{service::TransactionManagerService, validate::ValidateService},
        user::v2::UserService,
    },
    utils::runtime::IcEnvironment,
};

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone> {
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub rate_limit_service: RateLimitService<
        RateLimitIdentifier,
        RateLimitStateStore,
        RateLimitPrecision,
        FixedWindowCounterCore,
    >,
    pub action_service: ActionService<ThreadlocalRepositories>,
    pub link_service: LinkService<E, ThreadlocalRepositories>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub transaction_manager_service: TransactionManagerService<E, ThreadlocalRepositories>,
    pub user_service: UserService<ThreadlocalRepositories>,
    pub validate_service: ValidateService<ThreadlocalRepositories>,
    pub env: E,
}

impl<E: IcEnvironment + Clone> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        let repo = Rc::new(ThreadlocalRepositories);
        let env = E::new();
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
pub fn get_state<E: IcEnvironment + Clone>() -> CanisterState<E> {
    CanisterState::new()
}
