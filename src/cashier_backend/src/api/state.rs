use crate::{
    apps::{
        auth::AuthService,
        link_v2::service::LinkV2Service,
        link_v3::service::LinkV3Service,
        request_lock::RequestLockService,
        settings::SettingsService,
        token_fee::{IcrcTokenFetcher, TokenFeeService},
    },
    repositories::{
        AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories, auth::AuthServiceStorage,
    },
};
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};
use transaction_manager::v2::ic_transaction_manager::IcTransactionManager as IcTransactionManagerV2;
use transaction_manager::v3::ic_transaction_manager::IcTransactionManager as IcTransactionManagerV3;

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone + 'static> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_v2_service: LinkV2Service<ThreadlocalRepositories, IcTransactionManagerV2<E>>,
    pub link_v3_service: LinkV3Service<ThreadlocalRepositories, IcTransactionManagerV3<E>>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub token_fee_service: TokenFeeService<ThreadlocalRepositories, E, IcrcTokenFetcher>,
    pub env: E,
}

impl<E: IcEnvironment + Clone + 'static> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);

        let transaction_manager_v2 = Rc::new(IcTransactionManagerV2::new(env.clone()));
        let transaction_manager_v3 = Rc::new(IcTransactionManagerV3::new(env.clone()));
        let link_v2_service = LinkV2Service::new(&*repo, transaction_manager_v2.clone());
        let link_v3_service = LinkV3Service::new(&*repo, transaction_manager_v3.clone());

        let token_fee_service = TokenFeeService::new(&*repo, env.clone(), IcrcTokenFetcher::new());

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_v2_service,
            link_v3_service,
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            request_lock_service: RequestLockService::new(&repo),
            settings: SettingsService::new(&repo),
            token_fee_service,
            env,
        }
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
