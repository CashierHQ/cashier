use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use crate::types::link_detail::LinkDetail;
use crate::types::user::User;

pub mod link_store;
pub mod link_user_store;
pub mod user_store;
pub mod user_wallet_store;

const UPGRADES: MemoryId = MemoryId::new(0);
const USER_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_WALLET_MEMORY_ID: MemoryId = MemoryId::new(2);
const LINK_MEMORY_ID: MemoryId = MemoryId::new(3);
const LINK_USER_MEMORY_ID: MemoryId = MemoryId::new(4);

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

    static USER_WALLET_STORE: RefCell<StableBTreeMap<
        String,
        String,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_WALLET_MEMORY_ID)),
        )
    );

    static LINK_STORE: RefCell<StableBTreeMap<
        String,
        LinkDetail,
        Memory
        >> = RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
            )
        );

    static LINK_USER_STORE: RefCell<StableBTreeMap<
        String,
        u64,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_USER_MEMORY_ID)),
        )
    );

}

pub fn get_upgrade_memory() -> Memory {
    MEMORY_MANAGER.with(|m| m.borrow().get(UPGRADES))
}

pub fn load() {
    USER_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)));
    });

    USER_WALLET_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_WALLET_MEMORY_ID)));
    });

    LINK_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)));
    });

    LINK_USER_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(LINK_USER_MEMORY_ID)));
    });
}
