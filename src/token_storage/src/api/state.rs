use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};

use crate::{
    ckbtc::ic_ckbtc_minter_client::IcCkBtcMinterClient,
    icrc7::ic_icrc7_validator::ICIcrc7Validator,
    repository::{AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, ThreadlocalRepositories},
    services::{
        auth::{AuthService, AuthServiceStorage},
        settings::SettingsService,
        token_registry::TokenRegistryService,
        user_ckbtc::UserCkBtcService,
        user_nft::UserNftService,
        user_preference::UserPreferenceService,
        user_token::UserTokenService,
    },
};

thread_local! {
    static CKBTC_MINTER_CANISTER_ID: RefCell<Principal> =
        const { RefCell::new(Principal::anonymous()) };
}

/// The state of the canister
pub struct CanisterState {
    pub auth_service: AuthService<&'static LocalKey<RefCell<AuthServiceStorage>>>,
    pub log_service: LoggerConfigService<&'static LocalKey<RefCell<LoggerServiceStorage>>>,
    pub settings: SettingsService<ThreadlocalRepositories>,
    pub token_registry: TokenRegistryService<ThreadlocalRepositories>,
    pub user_preference: UserPreferenceService<ThreadlocalRepositories>,
    pub user_token: UserTokenService<ThreadlocalRepositories>,
    pub user_nft: UserNftService<ThreadlocalRepositories, ICIcrc7Validator>,
    pub user_ckbtc: UserCkBtcService<ThreadlocalRepositories, IcCkBtcMinterClient>,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        let repo = ThreadlocalRepositories;
        let ic_icrc7_validator = ICIcrc7Validator;
        let ckbtc_minter_client = IcCkBtcMinterClient;

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            settings: SettingsService::new(&repo),
            token_registry: TokenRegistryService::new(&repo),
            user_preference: UserPreferenceService::new(&repo),
            user_token: UserTokenService::new(&repo),
            user_nft: UserNftService::new(&repo, ic_icrc7_validator),
            user_ckbtc: UserCkBtcService::new(&repo, ckbtc_minter_client),
        }
    }

    /// Sets the CKBTC minter canister ID
    /// # Arguments
    /// * `canister_id` - The principal ID of the CKBTC minter canister
    pub fn set_ckbtc_minter_canister_id(&self, canister_id: Principal) {
        CKBTC_MINTER_CANISTER_ID.with(|id| {
            *id.borrow_mut() = canister_id;
        });
    }

    /// Gets the CKBTC minter canister ID
    /// # Returns
    /// * `Principal` - The principal ID of the CKBTC minter canister
    pub fn get_ckbtc_minter_canister_id(&self) -> Principal {
        CKBTC_MINTER_CANISTER_ID.with(|id| *id.borrow())
    }
}

/// Returns the state of the canister
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
