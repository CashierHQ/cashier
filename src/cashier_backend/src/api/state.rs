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
        token_fee::{IcrcTokenFetcher, TokenFeeService},
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
}

/// The state of the canister
pub struct CanisterState<E: IcEnvironment + Clone + 'static> {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub link_v2_service: LinkV2Service<ThreadlocalRepositories, IcTransactionManager<E>>,
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

        let transaction_manager_v2 = IcTransactionManager::new(env.clone());
        let link_v2_service = LinkV2Service::new(&*repo, Rc::new(transaction_manager_v2));

        let token_fee_service = TokenFeeService::new(&*repo, env.clone(), IcrcTokenFetcher::new());

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            link_v2_service,
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            request_lock_service: RequestLockService::new(&repo),
            settings: SettingsService::new(&repo),
            token_fee_service,
            env,
        }
    }

    /// Sets the token storage canister ID
    /// # Arguments
    /// * `canister_id` - The principal ID of the token storage canister
    pub fn set_token_storage_canister_id(&self, canister_id: Principal) {
        TOKEN_STORAGE_CANISTER_ID.with(|id| {
            *id.borrow_mut() = canister_id;
        });
    }

    /// Gets the token storage canister ID
    /// # Returns
    /// * `Principal` - The principal ID of the token storage canister
    pub fn get_token_storage_canister_id(&self) -> Principal {
        TOKEN_STORAGE_CANISTER_ID.with(|id| id.borrow().clone())
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState<RealIcEnvironment> {
    CanisterState::new(RealIcEnvironment::new())
}
