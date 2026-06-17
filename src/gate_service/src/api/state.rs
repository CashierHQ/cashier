// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repositories::{AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories},
    services::{
        auth::{AuthService, AuthServiceStorage},
        gate::GateService,
    },
};
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub gate_service: GateService<ThreadlocalRepositories>,
    pub _env: E,
}

impl<E: IcEnvironment + Clone> CanisterState<E> {
    /// Creates a new `CanisterState` wiring all services to their stable-memory stores.
    /// # Arguments
    /// * `env`: IC environment abstraction (use `RealIcEnvironment` in production).
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);
        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            gate_service: GateService::new(repo.clone()),
            _env: env,
        }
    }
}

/// Returns a fresh `CanisterState` bound to stable-memory stores.
/// Called at the start of each API handler — it is cheap because the stores are
/// thread-locals and no data is copied.
/// # Returns
/// A `CanisterState` ready for use within the current IC message.
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
