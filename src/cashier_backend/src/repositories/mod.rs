// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::cell::RefCell;
use std::collections::HashMap;

use cashier_types::processing_transaction::ProcessingTransaction;
use cashier_types::rate_limit::RateLimitEntry;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

// Import v2 types directly
use cashier_types::intent::v2::Intent as IntentV2;
use cashier_types::transaction::v2::Transaction as TransactionV2;

// Import all necessary types with proper module paths
use cashier_types::action::v1::Action;
use cashier_types::action_intent::v1::ActionIntent;
use cashier_types::intent_transaction::v1::IntentTransaction;
use cashier_types::keys::*;
use cashier_types::link::v1::Link;
use cashier_types::link_action::v1::LinkAction;
use cashier_types::request_lock::RequestLock;
use cashier_types::user::v1::User;
use cashier_types::user_action::v1::UserAction;
use cashier_types::user_link::v1::UserLink;
use cashier_types::user_wallet::v1::UserWallet;

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

pub mod processing_transaction;
pub mod rate_limit;
pub mod request_lock;

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

// processing transactions, for canister upgrading
const PROCESSING_TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(12);

const REQUEST_LOCK_MEMORY_ID: MemoryId = MemoryId::new(25);

// Unused Memory IDs but it used before, due to canister doesn't support shrink allocated memory
const _UNUSED_MEMORY_ID_12: MemoryId = MemoryId::new(12);
const _UNUSED_MEMORY_ID_13: MemoryId = MemoryId::new(13);
const _UNUSED_MEMORY_ID_14: MemoryId = MemoryId::new(14);
const _UNUSED_MEMORY_ID_15: MemoryId = MemoryId::new(15);
const _UNUSED_MEMORY_ID_16: MemoryId = MemoryId::new(16);
const _UNUSED_MEMORY_ID_17: MemoryId = MemoryId::new(17);
const _UNUSED_MEMORY_ID_18: MemoryId = MemoryId::new(18);
const _UNUSED_MEMORY_ID_19: MemoryId = MemoryId::new(19);
const _UNUSED_MEMORY_ID_20: MemoryId = MemoryId::new(20);
const _UNUSED_MEMORY_ID_21: MemoryId = MemoryId::new(21);
const _UNUSED_MEMORY_ID_22: MemoryId = MemoryId::new(22);
const _UNUSED_MEMORY_ID_23: MemoryId = MemoryId::new(23);
const _UNUSED_MEMORY_ID_24: MemoryId = MemoryId::new(24);

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static USER_STORE: RefCell<StableBTreeMap<
        UserKey,
        User,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)),
        )
    );

    pub static USER_WALLET_STORE: RefCell<StableBTreeMap<
        UserWalletKey,
        UserWallet,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_WALLET_MEMORY_ID)),
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

    pub static USER_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        UserAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_ACTION_MEMORY_ID)),
        )
    );

    pub static LINK_STORE: RefCell<StableBTreeMap<
        LinkKey,
        Link,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
        )
    );

    pub static LINK_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        LinkAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_ACTION_MEMORY_ID)),
        )
    );

    pub static ACTION_STORE: RefCell<StableBTreeMap<
        ActionKey,
        Action,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_MEMORY_ID)),
        )
    );

    pub static ACTION_INTENT_STORE: RefCell<StableBTreeMap<
        String,
        ActionIntent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_INTENT_MEMORY_ID)),
        )
    );

    pub static INTENT_STORE: RefCell<StableBTreeMap<
        String,
        IntentV2,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_MEMORY_ID)),
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

    pub static TRANSACTION_STORE: RefCell<StableBTreeMap<
        TransactionKey,
        TransactionV2,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)),
        )
    );

    pub static PROCESSING_TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        ProcessingTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(PROCESSING_TRANSACTION_MEMORY_ID)),
        )
    );

    pub static REQUEST_LOCK_STORE: RefCell<StableBTreeMap<
        RequestLockKey,
        RequestLock,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(REQUEST_LOCK_MEMORY_ID))),
    );

    // HEAP MEMORY
    pub static RATE_LIMIT_STORE: RefCell<HashMap<String, RateLimitEntry>> = RefCell::new(
        HashMap::new()
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

    PROCESSING_TRANSACTION_STORE.with(|t| {
        *t.borrow_mut() = StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(PROCESSING_TRANSACTION_MEMORY_ID)),
        );
    });

    REQUEST_LOCK_STORE.with(|t| {
        *t.borrow_mut() =
            StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(REQUEST_LOCK_MEMORY_ID)));
    });
}
