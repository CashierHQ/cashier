// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};
use transaction_manager::{
    transaction::{
        executor_service::IcExecutorService, ic_transaction_executor::IcTransactionExecutor,
        ic_transaction_validator::IcTransactionValidator, validator_service::IcValidatorService,
    },
    v3::ic_transaction_manager::IcTransactionManager as IcTransactionManagerV3,
};

use crate::{
    apps::{
        auth::AuthService,
        backoff::BackoffService,
        gate_service::service::{GateAppService, GateServiceWrapper},
        link_v3::service::LinkV3Service,
        rate_limit::RateLimitService,
        settings::SettingsService,
        token_balance::service::TokenBalanceService,
        token_fee::{fetcher::IcrcTokenFetcher, service::TokenFeeService},
        token_standard::service::TokenStandardService,
        token_storage::service::TokenStorageService,
    },
    repositories::{
        AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, Repositories, ThreadlocalRepositories,
        auth::AuthServiceStorage,
    },
};

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone + 'static> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_v3_service: LinkV3Service<ThreadlocalRepositories>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub transaction_manager_v3: IcTransactionManagerV3<E>,
    pub token_fee_service: TokenFeeService<ThreadlocalRepositories, E, IcrcTokenFetcher>,
    pub token_standard_service:
        TokenStandardService<ThreadlocalRepositories, TokenStorageService, E>,
    pub token_balance_service: TokenBalanceService,
    pub backoff_service: BackoffService<ThreadlocalRepositories>,
    pub gate_service: GateAppService<ThreadlocalRepositories, GateServiceWrapper>,
    pub rate_limit_service: RateLimitService<ThreadlocalRepositories>,
    pub validator_service: IcValidatorService<IcTransactionValidator>,
    pub executor_service: IcExecutorService<IcTransactionExecutor>,
    pub env: E,
}

impl<E: IcEnvironment + Clone + 'static> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);

        let transaction_manager_v3 = IcTransactionManagerV3::new(env.clone());
        let link_v3_service = LinkV3Service::new(&*repo);

        let token_fee_service = TokenFeeService::new(&*repo, env.clone(), IcrcTokenFetcher::new());

        // Canister IDs are persisted in stable Settings; read them at construction.
        // Default is the anonymous principal when unset (pre-wiring); set via init/admin endpoints.
        let settings_repo = repo.settings();
        let token_storage_canister_id =
            settings_repo.read(|settings| settings.token_storage_canister_id);
        let token_standard_service = TokenStandardService::new(
            &*repo,
            TokenStorageService::new(token_storage_canister_id),
            env.clone(),
        );
        let token_balance_service = TokenBalanceService;
        let validator_service = IcValidatorService::new(IcTransactionValidator);
        let executor_service = IcExecutorService::new(IcTransactionExecutor);

        let gate_service_canister_id =
            settings_repo.read(|settings| settings.gate_service_canister_id);
        let gate_service =
            GateAppService::new(&*repo, GateServiceWrapper::new(gate_service_canister_id));
        let rate_limit_service = RateLimitService::new(&*repo);
        let backoff_service = BackoffService::new(&*repo);

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_v3_service,
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            settings: SettingsService::new(&repo),
            transaction_manager_v3,
            token_fee_service,
            token_standard_service,
            token_balance_service,
            backoff_service,
            gate_service,
            rate_limit_service,
            validator_service,
            executor_service,
            env,
        }
    }

    /// Sets the token storage canister ID
    /// # Arguments
    /// * `canister_id` - The principal ID of the token storage canister
    pub fn set_token_storage_canister_id(&mut self, canister_id: Principal) {
        // Persist in stable Settings (survives upgrades)...
        self.settings.set_token_storage_canister_id(canister_id);
        // ...and propagate to the live service for this call cycle.
        self.token_standard_service
            .set_token_storage_canister_id(canister_id);
    }

    /// Sets the gate service canister ID
    /// # Arguments
    /// * `canister_id` - The principal ID of the gate service canister
    pub fn set_gate_service_canister_id(&mut self, canister_id: Principal) {
        // Persist in stable Settings (survives upgrades)...
        self.settings.set_gate_service_canister_id(canister_id);
        // ...and propagate to the live service for this call cycle.
        self.gate_service.set_canister_id(canister_id);
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
