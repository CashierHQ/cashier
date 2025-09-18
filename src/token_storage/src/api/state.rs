use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use ic_mple_client::IcCanisterClient;
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};

use crate::{
    repository::{AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories},
    services::{
        auth::{AuthService, AuthServiceStorage},
        settings::SettingsService,
        token_price::{PriceMap, TokenPriceService},
        token_registry::TokenRegistryService,
        user_preference::UserPreferenceService,
        user_token::UserTokenService,
    },
};

/// The state of the canister
pub struct CanisterState {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub token_price:
        TokenPriceService<&'static LocalKey<RefCell<PriceMap>>, IcCanisterClient, IcCanisterClient>,
    pub token_registry: TokenRegistryService<ThreadlocalRepositories>,
    pub user_preference: UserPreferenceService<ThreadlocalRepositories>,
    pub user_token: UserTokenService<ThreadlocalRepositories>,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        let repo = ThreadlocalRepositories;

        let TO_DO_FIX_ME = 0;
        let kongswap_principal = Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai").unwrap();
        let kongswap_client = IcCanisterClient::new(kongswap_principal, Some(30));
        let icpswap_principal = Principal::from_text("ggzvv-5qaaa-aaaag-qck7a-cai").unwrap();
        let icpswap_client = IcCanisterClient::new(icpswap_principal, Some(30));

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            settings: SettingsService::new(&repo),
            token_price: TokenPriceService::new_thread_local(kongswap_client, icpswap_client),
            token_registry: TokenRegistryService::new(&repo),
            user_preference: UserPreferenceService::new(&repo),
            user_token: UserTokenService::new(&repo),
        }
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
