// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, rc::Rc, thread::LocalKey};
use transaction_manager::ic_transaction_manager::IcTransactionManager;

use crate::{
    apps::{
        auth::AuthService,
        link_v2::service::LinkV2Service,
        request_lock::RequestLockService,
        settings::SettingsService,
        token_balance::service::TokenBalanceService,
        token_fee::{fetcher::IcrcTokenFetcher, service::TokenFeeService},
        token_standard::service::TokenStandardService,
        token_storage::{self, service::TokenStorageService},
    },
    repositories::{
        AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories, auth::AuthServiceStorage,
    },
};

thread_local! {
    static TOKEN_STORAGE_CANISTER_ID: RefCell<Principal> =
        const { RefCell::new(Principal::anonymous()) };
}

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone + 'static> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_v2_service: LinkV2Service<ThreadlocalRepositories>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub request_lock_service: RequestLockService<ThreadlocalRepositories>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub transaction_manager_v2: IcTransactionManager<E>,
    pub token_fee_service: TokenFeeService<ThreadlocalRepositories, E, IcrcTokenFetcher>,
    pub token_standard_service:
        TokenStandardService<ThreadlocalRepositories, TokenStorageService, E>,
    pub token_balance_service: TokenBalanceService,
    pub env: E,
}

impl<E: IcEnvironment + Clone + 'static> CanisterState<E> {
    /// Creates a new CanisterState
    pub fn new(env: E) -> Self {
        let repo = Rc::new(ThreadlocalRepositories);

        let transaction_manager_v2 = IcTransactionManager::new(env.clone());
        let link_v2_service = LinkV2Service::new(&*repo);

        let token_fee_service = TokenFeeService::new(&*repo, env.clone(), IcrcTokenFetcher::new());

        let token_storage_canister_id = TOKEN_STORAGE_CANISTER_ID.with(|id| *id.borrow());
        let token_standard_service = TokenStandardService::new(
            &*repo,
            TokenStorageService::new(token_storage_canister_id),
            env.clone(),
        );
        let token_balance_service = TokenBalanceService;

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_v2_service,
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            request_lock_service: RequestLockService::new(&repo),
            settings: SettingsService::new(&repo),
            transaction_manager_v2,
            token_fee_service,
            token_standard_service,
            token_balance_service,
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
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
