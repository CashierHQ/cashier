use crate::{
    link_v2::services::link_service::LinkV2Service,
    repositories::{AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories},
    services::{
        auth::{AuthService, AuthServiceStorage},
        request_lock::RequestLockService,
        settings::SettingsService,
    },
};
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};
use transaction_manager::ic_transaction_manager::IcTransactionManager;

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone + 'static> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_v2_service: LinkV2Service<ThreadlocalRepositories, IcTransactionManager<E>>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub env: E,
}

impl<E: IcEnvironment + Clone + 'static> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);

        let transaction_manager_v2 = IcTransactionManager::new(env.clone());
        let link_v2_service = LinkV2Service::new(&*repo, Rc::new(transaction_manager_v2));

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_v2_service,
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            request_lock_service: RequestLockService::new(&repo),
            settings: SettingsService::new(&repo),
            env,
        }
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
