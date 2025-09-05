// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod balance_cache;
pub mod token_registry;
pub mod token_registry_metadata;
pub mod user_preference;
pub mod user_token;

use std::cell::RefCell;
use std::collections::HashMap;

use candid::Principal;
use ic_mple_log::LogSettings;
use ic_mple_log::service::LoggerServiceStorage;
use ic_mple_utils::store::Storage;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell};
use token_storage_types::TokenId;
use token_storage_types::token::RegistryToken;
use token_storage_types::user::UserPreference;

use crate::repository::balance_cache::{
    BalanceCacheRepository, BalanceCacheRepositoryStorage, ThreadlocalBalanceCacheRepositoryStorage,
};
use crate::repository::token_registry::{
    ThreadlocalTokenRegistryRepositoryStorage, TokenRegistryRepository,
    TokenRegistryRepositoryStorage,
};
use crate::repository::token_registry_metadata::{
    ThreadlocalTokenRegistryMetadataRepositoryStorage, TokenRegistryMetadataRepository,
    TokenRegistryMetadataRepositoryStorage,
};
use crate::repository::user_preference::{
    ThreadlocalUserPreferenceRepositoryStorage, UserPreferenceRepository,
    UserPreferenceRepositoryStorage,
};
use crate::repository::user_token::{
    ThreadlocalUserTokenRepositoryStorage, UserTokenRepository, UserTokenRepositoryStorage,
};
use crate::services::auth::AuthServiceStorage;
use crate::types::{Candid, TokenBalance, TokenRegistryMetadata, UserTokenList};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

pub type BalanceCache = Candid<HashMap<TokenId, TokenBalance>>;

const LOG_SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(0);
const TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_PREFERENCE_MEMORY_ID: MemoryId = MemoryId::new(2);
const TOKEN_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(3);
const BALANCE_CACHE_MEMORY_ID: MemoryId = MemoryId::new(4);
const TOKEN_REGISTRY_METADATA_ID: MemoryId = MemoryId::new(5);
const AUTH_SERVICE_MEMORY_ID: MemoryId = MemoryId::new(6);

/// A trait for accessing repositories
pub trait Repositories {
    type BalanceCache: Storage<BalanceCacheRepositoryStorage>;
    type TokenRegistryMetadata: Storage<TokenRegistryMetadataRepositoryStorage>;
    type TokenRegistry: Storage<TokenRegistryRepositoryStorage>;
    type UserPreference: Storage<UserPreferenceRepositoryStorage>;
    type UserToken: Storage<UserTokenRepositoryStorage>;

    /// Get the balance cache repository
    fn balance_cache(&self) -> BalanceCacheRepository<Self::BalanceCache>;
    /// Get the token registry repository
    fn token_registry(&self) -> TokenRegistryRepository<Self::TokenRegistry>;
    /// Get the token registry metadata repository
    fn token_registry_metadata(
        &self,
    ) -> TokenRegistryMetadataRepository<Self::TokenRegistryMetadata>;
    /// Get the user preference repository
    fn user_preference(&self) -> UserPreferenceRepository<Self::UserPreference>;
    /// Get the user token repository
    fn user_token(&self) -> UserTokenRepository<Self::UserToken>;
}

/// A factory for creating repositories backed by thread-local storage
pub struct ThreadlocalRepositories;

impl Repositories for ThreadlocalRepositories {
    type BalanceCache = ThreadlocalBalanceCacheRepositoryStorage;
    type TokenRegistryMetadata = ThreadlocalTokenRegistryMetadataRepositoryStorage;
    type TokenRegistry = ThreadlocalTokenRegistryRepositoryStorage;
    type UserPreference = ThreadlocalUserPreferenceRepositoryStorage;
    type UserToken = ThreadlocalUserTokenRepositoryStorage;

    fn balance_cache(&self) -> BalanceCacheRepository<Self::BalanceCache> {
        BalanceCacheRepository::new(&BALANCE_CACHE_STORE)
    }

    fn token_registry(&self) -> TokenRegistryRepository<Self::TokenRegistry> {
        TokenRegistryRepository::new(&TOKEN_REGISTRY_STORE)
    }

    fn token_registry_metadata(
        &self,
    ) -> TokenRegistryMetadataRepository<Self::TokenRegistryMetadata> {
        TokenRegistryMetadataRepository::new(&TOKEN_REGISTRY_METADATA_STORE)
    }

    fn user_preference(&self) -> UserPreferenceRepository<Self::UserPreference> {
        UserPreferenceRepository::new(&USER_PREFERENCE_STORE)
    }

    fn user_token(&self) -> UserTokenRepository<Self::UserToken> {
        UserTokenRepository::new(&USER_TOKEN_STORE)
    }
}

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    /// Store for the auth service
        pub static AUTH_SERVICE_STORE: RefCell<AuthServiceStorage> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(AUTH_SERVICE_MEMORY_ID)),
            )
        );

    // Store for the logger settings
    pub static LOGGER_SERVICE_STORE: RefCell<LoggerServiceStorage> =
        RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LOG_SETTINGS_MEMORY_ID)),
                LogSettings::default(),
            )
        );

    // Store user's token references (not full token data)
    // user enable list
    static USER_TOKEN_STORE: RefCell<StableBTreeMap<Principal, UserTokenList, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)),
            )
        );

    // Store user preferences
    static USER_PREFERENCE_STORE: RefCell<StableBTreeMap<Principal, UserPreference, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(USER_PREFERENCE_MEMORY_ID)),
            )
        );

    // Centralized token registry
    static TOKEN_REGISTRY_STORE: RefCell<StableBTreeMap<TokenId, RegistryToken, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_REGISTRY_MEMORY_ID)),
            )
        );

    // Store registry metadata including version
    static TOKEN_REGISTRY_METADATA_STORE: RefCell<StableCell<TokenRegistryMetadata, Memory>> =
    RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_REGISTRY_METADATA_ID)),
            TokenRegistryMetadata::default()
        )
    );

    // Balance cache for users
    static BALANCE_CACHE_STORE: RefCell<StableBTreeMap<Principal, BalanceCache, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(BALANCE_CACHE_MEMORY_ID)),
            )
        );
}

#[cfg(test)]
pub mod tests {

    use std::rc::Rc;

    use super::*;

    /// A struct for testing Repositories and services
    pub struct TestRepositories {
        balance_cache: Rc<RefCell<BalanceCacheRepositoryStorage>>,
        token_registry: Rc<RefCell<TokenRegistryRepositoryStorage>>,
        token_registry_metadata: Rc<RefCell<TokenRegistryMetadataRepositoryStorage>>,
        user_preference: Rc<RefCell<UserPreferenceRepositoryStorage>>,
        user_token: Rc<RefCell<UserTokenRepositoryStorage>>,
    }

    impl TestRepositories {
        /// Create a new instance of TestRepositories.
        ///
        /// This is a testing-only implementation of Repositories, which uses an
        /// isolated non thread-local storage.
        pub fn new() -> Self {
            let mm = MemoryManager::init(DefaultMemoryImpl::default());
            Self {
                balance_cache: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(BALANCE_CACHE_MEMORY_ID),
                ))),
                token_registry: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(TOKEN_REGISTRY_MEMORY_ID),
                ))),
                token_registry_metadata: Rc::new(RefCell::new(StableCell::init(
                    mm.get(TOKEN_REGISTRY_METADATA_ID),
                    TokenRegistryMetadata::default(),
                ))),
                user_preference: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(USER_PREFERENCE_MEMORY_ID),
                ))),
                user_token: Rc::new(RefCell::new(StableBTreeMap::init(mm.get(TOKEN_MEMORY_ID)))),
            }
        }
    }

    impl Repositories for TestRepositories {
        type BalanceCache = Rc<RefCell<StableBTreeMap<Principal, BalanceCache, Memory>>>;
        type TokenRegistryMetadata = Rc<RefCell<StableCell<TokenRegistryMetadata, Memory>>>;
        type TokenRegistry = Rc<RefCell<StableBTreeMap<TokenId, RegistryToken, Memory>>>;
        type UserPreference = Rc<RefCell<StableBTreeMap<Principal, UserPreference, Memory>>>;
        type UserToken = Rc<RefCell<StableBTreeMap<Principal, UserTokenList, Memory>>>;

        fn balance_cache(&self) -> BalanceCacheRepository<Self::BalanceCache> {
            BalanceCacheRepository::new(self.balance_cache.clone())
        }

        fn token_registry_metadata(
            &self,
        ) -> TokenRegistryMetadataRepository<Self::TokenRegistryMetadata> {
            TokenRegistryMetadataRepository::new(self.token_registry_metadata.clone())
        }

        fn token_registry(&self) -> TokenRegistryRepository<Self::TokenRegistry> {
            TokenRegistryRepository::new(self.token_registry.clone())
        }

        fn user_preference(&self) -> UserPreferenceRepository<Self::UserPreference> {
            UserPreferenceRepository::new(self.user_preference.clone())
        }

        fn user_token(&self) -> UserTokenRepository<Self::UserToken> {
            UserTokenRepository::new(self.user_token.clone())
        }
    }
}
