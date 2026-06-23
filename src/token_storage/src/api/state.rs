// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_log::service::{LoggerConfigService, LoggerServiceStorage};
use std::{cell::RefCell, thread::LocalKey};

use crate::{
    bitcoin::ckbtc::ic_ckbtc_minter_client::IcCkBtcMinterClient,
    ext::icrc::IcTokenMetadataFetcher,
    icrc7::ic_icrc7_validator::ICIcrc7Validator,
    repository::{AUTH_SERVICE_STORE, LOGGER_SERVICE_STORE, Repositories, ThreadlocalRepositories},
    runes::ic_omnity_bitcoin::IcOmnityBitcoin,
    services::{
        auth::{AuthService, AuthServiceStorage},
        settings::SettingsService,
        token_registry::TokenRegistryService,
        user_bitcoin::UserCkBtcService,
        user_nft::UserNftService,
        user_preference::UserPreferenceService,
        user_runes::UserRunesService,
        user_token::UserTokenService,
    },
};

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
    pub user_runes: UserRunesService<ThreadlocalRepositories>,
    pub omnity_bitcoin: IcOmnityBitcoin,
    pub token_metadata_fetcher: IcTokenMetadataFetcher,
}

impl CanisterState {
    /// Creates a new CanisterState
    pub fn new() -> Self {
        let repo = ThreadlocalRepositories;
        let ic_icrc7_validator = ICIcrc7Validator;
        let ckbtc_minter_client = IcCkBtcMinterClient;
        let omnity_bitcoin = IcOmnityBitcoin;
        let token_metadata_fetcher = IcTokenMetadataFetcher;

        // Canister ids are persisted in stable Settings; read omnity id for user_runes construction.
        let omnity_bitcoin_id = repo.settings().read(|settings| settings.omnity_bitcoin_id);

        CanisterState {
            auth_service: AuthService::new(&AUTH_SERVICE_STORE),
            log_service: LoggerConfigService::new(&LOGGER_SERVICE_STORE),
            settings: SettingsService::new(&repo),
            token_registry: TokenRegistryService::new(&repo),
            user_preference: UserPreferenceService::new(&repo),
            user_token: UserTokenService::new(&repo),
            user_nft: UserNftService::new(&repo, ic_icrc7_validator),
            user_ckbtc: UserCkBtcService::new(&repo, ckbtc_minter_client),
            user_runes: UserRunesService::new(&repo, omnity_bitcoin_id),
            omnity_bitcoin,
            token_metadata_fetcher,
        }
    }

    /// Sets the CKBTC minter canister ID (persisted in stable Settings; survives upgrades).
    pub fn set_ckbtc_minter_id(&mut self, canister_id: Principal) {
        self.settings.set_ckbtc_minter_id(canister_id);
    }

    /// Gets the CKBTC minter canister ID (from stable Settings).
    pub fn get_ckbtc_minter_id(&self) -> Principal {
        self.settings.get_ckbtc_minter_id()
    }

    /// Sets the Omnity Bitcoin canister ID (persisted in stable Settings; survives upgrades).
    pub fn set_omnity_bitcoin_id(&mut self, canister_id: Principal) {
        self.settings.set_omnity_bitcoin_id(canister_id);
    }

    /// Gets the Omnity Bitcoin canister ID (from stable Settings).
    pub fn get_omnity_bitcoin_id(&self) -> Principal {
        self.settings.get_omnity_bitcoin_id()
    }
}

/// Returns the state of the canister
#[inline(always)]
pub fn get_state() -> CanisterState {
    CanisterState::new()
}
