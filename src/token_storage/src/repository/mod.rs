pub mod balance_cache;
pub mod token_registry;
pub mod user_preference;
pub mod user_token;

use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use crate::types::{Candid, RegistryToken, TokenBalance, TokenId, UserPreference};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

const UPGRADES: MemoryId = MemoryId::new(0);
const TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_PREFERENCE_MEMORY_ID: MemoryId = MemoryId::new(2);
const TOKEN_REGISTRY_MEMORY_ID: MemoryId = MemoryId::new(3);
const BALANCE_CACHE_MEMORY_ID: MemoryId = MemoryId::new(4);

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    // Store user's token references (not full token data)
    pub static USER_TOKEN_STORE: RefCell<StableBTreeMap<String, Candid<Vec<TokenId>>, Memory>> =
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

    // Balance cache for users
    pub static BALANCE_CACHE_STORE: RefCell<StableBTreeMap<String, Candid<Vec<TokenBalance>>, Memory>> =
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
}
