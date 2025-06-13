// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

pub mod action;
pub mod action_intent;
pub mod base_repository;
pub mod intent;
pub mod intent_transaction;
// pub mod intent_v2;
pub mod link;
pub mod link_action;
pub mod transaction;
// pub mod transaction_v2;
pub mod user;
pub mod user_action;
pub mod user_link;
pub mod user_wallet;

const UPGRADES: MemoryId = MemoryId::new(0);

const USER_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_WALLET_MEMORY_ID: MemoryId = MemoryId::new(2);
const USER_LINK_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_ACTION_MEMORY_ID: MemoryId = MemoryId::new(4);
const LINK_MEMORY_ID: MemoryId = MemoryId::new(5);
const LINK_ACTION_MEMORY_ID: MemoryId = MemoryId::new(6);
const ACTION_MEMORY_ID: MemoryId = MemoryId::new(7);
const ACTION_INTENT_MEMORY_ID: MemoryId = MemoryId::new(8);
const INTENT_MEMORY_ID: MemoryId = MemoryId::new(9);
const INTENT_TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(10);
const TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(11);

// Versioned Memory IDs starting from 12
const VERSIONED_USER_MEMORY_ID: MemoryId = MemoryId::new(12);
const VERSIONED_USER_WALLET_MEMORY_ID: MemoryId = MemoryId::new(13);
const VERSIONED_USER_LINK_MEMORY_ID: MemoryId = MemoryId::new(14);
const VERSIONED_USER_ACTION_MEMORY_ID: MemoryId = MemoryId::new(15);
const VERSIONED_LINK_MEMORY_ID: MemoryId = MemoryId::new(16);
const VERSIONED_LINK_ACTION_MEMORY_ID: MemoryId = MemoryId::new(17);
const VERSIONED_ACTION_MEMORY_ID: MemoryId = MemoryId::new(18);
const VERSIONED_ACTION_INTENT_MEMORY_ID: MemoryId = MemoryId::new(19);
// DEPRECATED: Use VERSIONED_INTENT_MEMORY_ID_V2 instead
const VERSIONED_INTENT_MEMORY_ID: MemoryId = MemoryId::new(20);
const VERSIONED_INTENT_TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(21);
// DEPRECATED: Use VERSIONED_TRANSACTION_MEMORY_ID_V2 instead
const VERSIONED_TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(22);

//  Versioned Memory IDs V2 starting migrate from 23
const VERSIONED_INTENT_MEMORY_ID_V2: MemoryId = MemoryId::new(23);
const VERSIONED_TRANSACTION_MEMORY_ID_V2: MemoryId = MemoryId::new(24);

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static USER_STORE: RefCell<StableBTreeMap<
        cashier_types::UserKey,
        cashier_types::User,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)),
        )
    );

    pub static USER_WALLET_STORE: RefCell<StableBTreeMap<
        cashier_types::UserWalletKey,
        cashier_types::UserWallet,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_WALLET_MEMORY_ID)),
        )
    );

    pub static USER_LINK_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::UserLink,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_LINK_MEMORY_ID)),
        )
    );

    pub static USER_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::UserAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_ACTION_MEMORY_ID)),
        )
    );

    pub static LINK_STORE: RefCell<StableBTreeMap<
        cashier_types::LinkKey,
        cashier_types::Link,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
        )
    );

    pub static LINK_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::LinkAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_ACTION_MEMORY_ID)),
        )
    );

    pub static ACTION_STORE: RefCell<StableBTreeMap<
        cashier_types::ActionKey,
        cashier_types::Action,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_MEMORY_ID)),
        )
    );

    pub static ACTION_INTENT_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::ActionIntent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_INTENT_MEMORY_ID)),
        )
    );

    pub static INTENT_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::Intent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_MEMORY_ID)),
        )
    );

    pub static INTENT_TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::IntentTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_TRANSACTION_MEMORY_ID)),
        )
    );

    pub static TRANSACTION_STORE: RefCell<StableBTreeMap<
        cashier_types::TransactionKey,
        cashier_types::Transaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)),
        )
    );

    // Versioned Stores
    pub static VERSIONED_USER_STORE: RefCell<StableBTreeMap<
        cashier_types::UserKey,
        cashier_types::VersionedUser,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_MEMORY_ID)),
        )
    );

    pub static VERSIONED_USER_WALLET_STORE: RefCell<StableBTreeMap<
        cashier_types::UserWalletKey,
        cashier_types::VersionedUserWallet,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_WALLET_MEMORY_ID)),
        )
    );

    pub static VERSIONED_USER_LINK_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::VersionedUserLink,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_LINK_MEMORY_ID)),
        )
    );

    pub static VERSIONED_USER_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::VersionedUserAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_ACTION_MEMORY_ID)),
        )
    );

    pub static VERSIONED_LINK_STORE: RefCell<StableBTreeMap<
        cashier_types::LinkKey,
        cashier_types::VersionedLink,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_LINK_MEMORY_ID)),
        )
    );

    pub static VERSIONED_LINK_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::VersionedLinkAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_LINK_ACTION_MEMORY_ID)),
        )
    );

    pub static VERSIONED_ACTION_STORE: RefCell<StableBTreeMap<
        cashier_types::ActionKey,
        cashier_types::VersionedAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_ACTION_MEMORY_ID)),
        )
    );

    pub static VERSIONED_ACTION_INTENT_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::VersionedActionIntent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_ACTION_INTENT_MEMORY_ID)),
        )
    );

    pub static VERSIONED_INTENT_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::VersionedIntent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_INTENT_MEMORY_ID)),
        )
    );

    pub static VERSIONED_INTENT_TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::VersionedIntentTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_INTENT_TRANSACTION_MEMORY_ID)),
        )
    );

    pub static VERSIONED_TRANSACTION_STORE: RefCell<StableBTreeMap<
        cashier_types::TransactionKey,
        cashier_types::VersionedTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_TRANSACTION_MEMORY_ID)),
        )
    );

    // NEW
    pub static VERSIONED_INTENT_V2_STORE: RefCell<StableBTreeMap<
        String,
        cashier_types::intent::VersionedIntent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_INTENT_MEMORY_ID_V2)),
        )
    );

    pub static VERSIONED_TRANSACTION_V2_STORE: RefCell<StableBTreeMap<
        cashier_types::TransactionKey,
        cashier_types::transaction::VersionedTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_TRANSACTION_MEMORY_ID_V2)),
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

    USER_LINK_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_LINK_MEMORY_ID)));
    });

    USER_ACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_ACTION_MEMORY_ID)));
    });

    LINK_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)));
    });

    LINK_ACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(LINK_ACTION_MEMORY_ID)));
    });

    ACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_MEMORY_ID)));
    });

    ACTION_INTENT_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_INTENT_MEMORY_ID)));
    });

    INTENT_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_MEMORY_ID)));
    });

    INTENT_TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_TRANSACTION_MEMORY_ID)),
        );
    });

    TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)));
    });

    // Initialize versioned stores
    VERSIONED_USER_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_MEMORY_ID)));
    });

    VERSIONED_USER_WALLET_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_WALLET_MEMORY_ID)),
        );
    });

    VERSIONED_USER_LINK_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_LINK_MEMORY_ID)),
        );
    });

    VERSIONED_USER_ACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_USER_ACTION_MEMORY_ID)),
        );
    });

    VERSIONED_LINK_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_LINK_MEMORY_ID)));
    });

    VERSIONED_LINK_ACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_LINK_ACTION_MEMORY_ID)),
        );
    });

    VERSIONED_ACTION_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_ACTION_MEMORY_ID)));
    });

    VERSIONED_ACTION_INTENT_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_ACTION_INTENT_MEMORY_ID)),
        );
    });

    VERSIONED_INTENT_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_INTENT_MEMORY_ID)));
    });

    VERSIONED_INTENT_TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_INTENT_TRANSACTION_MEMORY_ID)),
        );
    });

    VERSIONED_TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(VERSIONED_TRANSACTION_MEMORY_ID)),
        );
    });
}
