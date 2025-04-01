pub mod token;
pub mod user_preference;

use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use crate::types::{Candid, UserPreference, UserToken};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

const UPGRADES: MemoryId = MemoryId::new(0);

const TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);

const USER_PERFERENCE_MEMORY_ID: MemoryId = MemoryId::new(2);

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static TOKEN_STORE: RefCell<StableBTreeMap<String, Candid<Vec<UserToken>>, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)),
            )
        );

    pub static USER_PREFERENCE_STORE: RefCell<StableBTreeMap<String, UserPreference, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(USER_PERFERENCE_MEMORY_ID)),
            )
        );


}

pub fn load() {
    TOKEN_STORE.with_borrow_mut(|store| {
        *store = StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)));
    });

    USER_PREFERENCE_STORE.with_borrow_mut(|store| {
        *store =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_PERFERENCE_MEMORY_ID)));
    });
}
