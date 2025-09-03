use crate::{repositories::ThreadlocalRepositories, services::GateService};
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use std::rc::Rc;

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone> {
    pub gate_service: GateService<ThreadlocalRepositories>,
    pub _env: E,
}

impl<E: IcEnvironment + Clone> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);
        CanisterState {
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
