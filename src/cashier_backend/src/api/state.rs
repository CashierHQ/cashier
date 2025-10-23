use crate::{
    link_v2::services::link_service::LinkV2Service,
    repositories::{AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories},
    services::{
        action::ActionService,
        auth::{AuthService, AuthServiceStorage},
        link::service::LinkService,
        request_lock::RequestLockService,
        settings::SettingsService,
        transaction_manager::{service::TransactionManagerService, validate::ValidateService},
    },
};
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone> {
    pub action_service: ActionService<ThreadlocalRepositories>,
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_service: LinkService<E, ThreadlocalRepositories>,
    pub link_v2_service: LinkV2Service<ThreadlocalRepositories>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub transaction_manager_service: TransactionManagerService<E, ThreadlocalRepositories>,
    pub validate_service: ValidateService<ThreadlocalRepositories>,
    pub env: E,
}

impl<E: IcEnvironment + Clone> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);
        CanisterState {
            action_service: ActionService::new(&repo),
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_service: LinkService::new(repo.clone(), env.clone()),
            link_v2_service: LinkV2Service::new(&repo),
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            request_lock_service: RequestLockService::new(&repo),
            settings: SettingsService::new(&repo),
            validate_service: ValidateService::new(&repo),
            transaction_manager_service: TransactionManagerService::new(repo, env.clone()),
            env,
        }
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
