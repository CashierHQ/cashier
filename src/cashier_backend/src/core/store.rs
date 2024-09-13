use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use crate::types::user::User;

const UPGRADES: MemoryId = MemoryId::new(0);
const USER_MEMORY_ID: MemoryId = MemoryId::new(1);

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USER_STORE: RefCell<StableBTreeMap<
        String,
        User,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)),
        )
    );

}

pub fn get_upgrade_memory() -> Memory {
    MEMORY_MANAGER.with(|m| m.borrow().get(UPGRADES))
}

pub mod store_state {
    use super::*;

    pub fn load() {
        USER_STORE.with(|t| {
            *t.borrow_mut() =
                StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)));
        });
    }
}

pub mod user_store {
    use super::*;

    // count total
    pub fn count() -> u64 {
        USER_STORE.with(|store| store.borrow().len())
    }

    pub fn get(user_pid: String) -> Option<User> {
        USER_STORE.with(|store| {
            let store = store.borrow();

            match store.get(&user_pid) {
                Some(user) => Some(user.clone()),
                None => None,
            }
        })
    }

    pub fn list(offset: usize, limit: usize) -> Vec<User> {
        USER_STORE.with(|store| {
            let records = store.borrow().iter().map(|(_, v)| v).collect::<Vec<_>>();

            // Ensure offset is within bounds
            if offset >= records.len() {
                return Vec::new();
            }

            let end = (offset + limit).min(records.len());
            records[offset..end].to_vec()
        })
    }

    pub fn insert(user: User) {
        USER_STORE.with(|store| {
            store.borrow_mut().insert(user.id.clone(), user);
        });
    }
}
