use crate::{
    link_v2::{
        services::link_service::LinkV2Service,
        transaction_manager::ic_transaction_manager::IcTransactionManager as TransactionManagerV2,
    },
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
pub struct CanisterState<E: IcEnvironment + Clone + 'static> {
    pub action_service: ActionService<ThreadlocalRepositories>,
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_service: LinkService<E, ThreadlocalRepositories>,
    pub link_v2_service: LinkV2Service<ThreadlocalRepositories, TransactionManagerV2<E>>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub transaction_manager_service: TransactionManagerService<E, ThreadlocalRepositories>,
    pub validate_service: ValidateService<ThreadlocalRepositories>,
    pub env: E,
}

impl<E: IcEnvironment + Clone + 'static> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);

        let transaction_manager_v2 = TransactionManagerV2::new(env.clone());
        let link_v2_service = LinkV2Service::new(&*repo, Rc::new(transaction_manager_v2));

        CanisterState {
            action_service: ActionService::new(&repo),
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_service: LinkService::new(repo.clone(), env.clone()),
            link_v2_service,
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
