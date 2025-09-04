use crate::{
    repositories::{ThreadlocalRepositories, AUTH_SERVICE_STORE},
    services::{
        auth::{AuthService, AuthServiceStorage},
        gate::GateService,
    },
};
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub gate_service: GateService<ThreadlocalRepositories>,
    pub _env: E,
}

impl<E: IcEnvironment + Clone> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);
        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            gate_service: GateService::new(repo.clone()),
            _env: env,
        }
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
