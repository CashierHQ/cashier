use std::cell::RefCell;

use entities::intent::Intent;
use entities::intent_transaction::IntentTransaction;
use entities::link::Link;
use entities::link_intent::LinkIntent;
use entities::transaction::Transaction;
use entities::user_intent::UserIntent;
use entities::user_link::UserLink;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

pub mod entities;
pub mod intent_store;
pub mod intent_transaction_store;
pub mod link_intent_store;
pub mod link_store;
pub mod transaction_store;
pub mod user_intent_store;
pub mod user_link_store;
pub mod user_store;
pub mod user_wallet_store;

const UPGRADES: MemoryId = MemoryId::new(0);
const USER_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_WALLET_MEMORY_ID: MemoryId = MemoryId::new(2);
const LINK_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_LINK_MEMORY_ID: MemoryId = MemoryId::new(4);
const INTENT_MEMORY_ID: MemoryId = MemoryId::new(5);
const TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(6);
const INTENT_TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(7);
const LINK_INTENT_MEMORY_ID: MemoryId = MemoryId::new(8);
const USER_INTENT_MEMORY_ID: MemoryId = MemoryId::new(9);

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static USER_STORE: RefCell<StableBTreeMap<
        String,
        entities::user::User,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)),
        )
    );

    pub static USER_WALLET_STORE: RefCell<StableBTreeMap<
        String,
        String,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_WALLET_MEMORY_ID)),
        )
    );

    pub static LINK_STORE: RefCell<StableBTreeMap<
        String,
        Link,
        Memory
        >> = RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
            )
        );

    pub static USER_LINK_STORE: RefCell<StableBTreeMap<
        String,
        UserLink,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_LINK_MEMORY_ID)),
        )
    );

    pub static INTENT_STORE: RefCell<StableBTreeMap<
        String,
        Intent,
        Memory
        >> = RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_MEMORY_ID)),
            )
        );

    pub static TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        Transaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)),
        )
    );

    pub static INTENT_TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        IntentTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_TRANSACTION_MEMORY_ID)),
        )
    );

    pub static LINK_INTENT_STORE: RefCell<StableBTreeMap<
        String,
        LinkIntent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_INTENT_MEMORY_ID)),
        )
    );

    pub static USER_INTENT_STORE: RefCell<StableBTreeMap<
        String,
        UserIntent,
        Memory
        >> = RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(USER_INTENT_MEMORY_ID)),
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

    USER_LINK_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_LINK_MEMORY_ID)));
    });

    INTENT_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_MEMORY_ID)));
    });

    TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)));
    });

    INTENT_TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_TRANSACTION_MEMORY_ID)),
        );
    });

    LINK_INTENT_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(LINK_INTENT_MEMORY_ID)));
    });

    USER_INTENT_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_INTENT_MEMORY_ID)));
    });
}
