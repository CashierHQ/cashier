// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod balance_cache;
pub mod token_registry;
pub mod token_registry_metadata;
pub mod user_preference;
pub mod user_token;

use std::cell::RefCell;
use std::collections::HashMap;

use ic_mple_log::LogSettings;
use ic_mple_log::service::LoggerServiceStorage;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell};

use crate::types::{
    Candid, RegistryToken, TokenBalance, TokenId, TokenRegistryMetadata, UserPreference,
    UserTokenList,
};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

pub type BalanceCache = Candid<HashMap<String, TokenBalance>>;

const _UPGRADES: MemoryId = MemoryId::new(0);
const TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_PREFERENCE_MEMORY_ID: MemoryId = MemoryId::new(2);
const TOKEN_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(3);
const BALANCE_CACHE_MEMORY_ID: MemoryId = MemoryId::new(4);
const TOKEN_REGISTRY_METADATA_ID: MemoryId = MemoryId::new(5);
const LOG_SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(6);

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    // Store the logger settings
    pub static LOGGER_SERVICE_STORE: RefCell<LoggerServiceStorage> =
        RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LOG_SETTINGS_MEMORY_ID)),
                LogSettings::default(),
            )
        );

    // Store user's token references (not full token data)
    // user enable list
    pub static USER_TOKEN_STORE: RefCell<StableBTreeMap<String, UserTokenList, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)),
            )
        );

    // Store user preferences
    pub static USER_PREFERENCE_STORE: RefCell<StableBTreeMap<String, UserPreference, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(USER_PREFERENCE_MEMORY_ID)),
            )
        );

    // Centralized token registry
    pub static TOKEN_REGISTRY_STORE: RefCell<StableBTreeMap<TokenId, RegistryToken, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_REGISTRY_MEMORY_ID)),
            )
        );

       // Store registry metadata including version
       pub static TOKEN_REGISTRY_METADATA_STORE: RefCell<StableCell<TokenRegistryMetadata, Memory>> =
       RefCell::new(
            StableCell::init(
               MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_REGISTRY_METADATA_ID)),
               TokenRegistryMetadata::default()
           )
       );

    // Balance cache for users
    pub static BALANCE_CACHE_STORE: RefCell<StableBTreeMap<String, BalanceCache, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(BALANCE_CACHE_MEMORY_ID)),
            )
        );
}

pub fn load() {
    USER_TOKEN_STORE.with_borrow_mut(|store| {
        *store = StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)));
    });

    USER_PREFERENCE_STORE.with_borrow_mut(|store| {
        *store =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_PREFERENCE_MEMORY_ID)));
    });

    TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
        *store =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_REGISTRY_MEMORY_ID)));
    });

    BALANCE_CACHE_STORE.with_borrow_mut(|store| {
        *store =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(BALANCE_CACHE_MEMORY_ID)));
    });

    TOKEN_REGISTRY_METADATA_STORE.with_borrow_mut(|store| {
        *store = StableCell::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_REGISTRY_METADATA_ID)),
            TokenRegistryMetadata::default(),
        );
    });
}
