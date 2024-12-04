use std::cell::RefCell;

use entities::action::Action;
use entities::action_transaction::ActionTransaction;
use entities::link::Link;
use entities::link_action::LinkAction;
use entities::transaction::Transaction;
use entities::user_link::UserLink;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

pub mod action_store;
pub mod entities;
pub mod link_store;
pub mod transaction_store;
pub mod user_link_store;
pub mod user_store;
pub mod user_wallet_store;

const UPGRADES: MemoryId = MemoryId::new(0);
const USER_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_WALLET_MEMORY_ID: MemoryId = MemoryId::new(2);
const LINK_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_LINK_MEMORY_ID: MemoryId = MemoryId::new(4);
const ACTION_MEMORY_ID: MemoryId = MemoryId::new(5);
const TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(6);
const ACTION_TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(7);
const LINK_ACTION_MEMORY_ID: MemoryId = MemoryId::new(8);

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USER_STORE: RefCell<StableBTreeMap<
        String,
        entities::user::User,
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
        Link,
        Memory
        >> = RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
            )
        );

    static USER_LINK_STORE: RefCell<StableBTreeMap<
        String,
        UserLink,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_LINK_MEMORY_ID)),
        )
    );

    static ACTION_STORE: RefCell<StableBTreeMap<
        String,
        Action,
        Memory
        >> = RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_MEMORY_ID)),
            )
        );

    static TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        Transaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)),
        )
    );

    static ACTION_TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        ActionTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_TRANSACTION_MEMORY_ID)),
        )
    );

    static LINK_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        LinkAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_ACTION_MEMORY_ID)),
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

    ACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_MEMORY_ID)));
    });

    TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)));
    });

    ACTION_TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_TRANSACTION_MEMORY_ID)),
        );
    });

    LINK_ACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(LINK_ACTION_MEMORY_ID)));
    });
}
