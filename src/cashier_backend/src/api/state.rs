use crate::{
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
use candid::Principal;
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use gate_service_backend_client::{IcCanisterClient, client::GateServiceBackendClient};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};

thread_local! {
    static GATE_SERVICE_CANISTER_ID: RefCell<Principal> = RefCell::new(Principal::anonymous());
}

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone> {
    pub action_service: ActionService<ThreadlocalRepositories>,
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_service: LinkService<E, ThreadlocalRepositories>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub transaction_manager_service: TransactionManagerService<E, ThreadlocalRepositories>,
    pub validate_service: ValidateService<ThreadlocalRepositories>,
    pub gate_service_client: GateServiceBackendClient<IcCanisterClient>,
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
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            request_lock_service: RequestLockService::new(&repo),
            settings: SettingsService::new(&repo),
            validate_service: ValidateService::new(&repo),
            transaction_manager_service: TransactionManagerService::new(repo, env.clone()),
            gate_service_client: GateServiceBackendClient::new(IcCanisterClient::new(
                GATE_SERVICE_CANISTER_ID.with(|id| *id.borrow()),
                Some(5 * 60), // 5 minutes timeout
            )),
            env,
        }
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}

pub fn update_setting(gate_service_canister_id: Principal) {
    GATE_SERVICE_CANISTER_ID.with_borrow_mut(|store| {
        *store = gate_service_canister_id;
    });
}
