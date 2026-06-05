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
    v2::ic_transaction_manager::IcTransactionManager as IcTransactionManagerV2,
    v3::ic_transaction_manager::IcTransactionManager as IcTransactionManagerV3,
};

use crate::{
    apps::{
        auth::AuthService,
        gate_service::service::{GateAppService, GateServiceWrapper},
        link_v2::service::LinkV2Service,
        link_v3::service::LinkV3Service,
        rate_limit::RateLimitService,
        request_lock::RequestLockService,
        settings::SettingsService,
        token_balance::service::TokenBalanceService,
        token_fee::{fetcher::IcrcTokenFetcher, service::TokenFeeService},
        token_standard::service::TokenStandardService,
        token_storage::service::TokenStorageService,
    },
    repositories::{
        AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories, auth::AuthServiceStorage,
    },
};

thread_local! {
    static TOKEN_STORAGE_CANISTER_ID: RefCell<Principal> =
        const { RefCell::new(Principal::anonymous()) };

    static GATE_SERVICE_CANISTER_ID: RefCell<Principal> =
        const { RefCell::new(Principal::anonymous()) };
}

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone + 'static> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_v3_service: LinkV3Service<ThreadlocalRepositories>,
    pub link_v2_service: LinkV2Service<ThreadlocalRepositories>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub transaction_manager_v2: IcTransactionManagerV2<E>,
    pub transaction_manager_v3: IcTransactionManagerV3<E>,
    pub token_fee_service: TokenFeeService<ThreadlocalRepositories, E, IcrcTokenFetcher>,
    pub token_standard_service:
        TokenStandardService<ThreadlocalRepositories, TokenStorageService, E>,
    pub token_balance_service: TokenBalanceService,
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

        let transaction_manager_v2 = IcTransactionManagerV2::new(env.clone());
        let link_v2_service = LinkV2Service::new(&*repo);
        let transaction_manager_v3 = IcTransactionManagerV3::new(env.clone());
        let link_v3_service = LinkV3Service::new(&*repo);

        let token_fee_service = TokenFeeService::new(&*repo, env.clone(), IcrcTokenFetcher::new());

        let token_storage_canister_id = TOKEN_STORAGE_CANISTER_ID.with(|id| *id.borrow());
        let token_standard_service = TokenStandardService::new(
            &*repo,
            TokenStorageService::new(token_storage_canister_id),
            env.clone(),
        );
        let token_balance_service = TokenBalanceService;
        let validator_service = IcValidatorService::new(IcTransactionValidator);
        let executor_service = IcExecutorService::new(IcTransactionExecutor);

        let gate_service_canister_id = GATE_SERVICE_CANISTER_ID.with(|id| *id.borrow());
        let gate_service =
            GateAppService::new(&*repo, GateServiceWrapper::new(gate_service_canister_id));
        let rate_limit_service = RateLimitService::new(&*repo);

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_v2_service,
            link_v3_service,
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            request_lock_service: RequestLockService::new(&repo),
            settings: SettingsService::new(&repo),
            transaction_manager_v2,
            transaction_manager_v3,
            token_fee_service,
            token_standard_service,
            token_balance_service,
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
        TOKEN_STORAGE_CANISTER_ID.with(|id| {
            *id.borrow_mut() = canister_id;
        });

        self.token_standard_service
            .set_token_storage_canister_id(canister_id);
    }

    /// Sets the gate service canister ID
    /// # Arguments
    /// * `canister_id` - The principal ID of the gate service canister
    pub fn set_gate_service_canister_id(&mut self, canister_id: Principal) {
        GATE_SERVICE_CANISTER_ID.with(|id| {
            *id.borrow_mut() = canister_id;
        });

        self.gate_service.set_canister_id(canister_id);
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
