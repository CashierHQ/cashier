// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::cell::RefCell;
use std::thread::LocalKey;
use std::time::Duration;

use cashier_backend_types::service::rate_limit::RateLimitStateStoreRunetime;
use ic_mple_log::LogSettings;
use ic_mple_log::service::{LoggerServiceStorage, Storage};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell};

// Import v2 types directly

use cashier_backend_types::repository::{
    action::v1::Action, action_intent::v1::ActionIntent, intent::v2::Intent as IntentV2,
    intent_transaction::v1::IntentTransaction, keys::*, link::v1::Link,
    link_action::v1::LinkAction, processing_transaction::ProcessingTransaction,
    request_lock::RequestLock, transaction::v2::Transaction as TransactionV2, user::v1::User,
    user_action::v1::UserAction, user_link::v1::UserLink, user_wallet::v1::UserWallet,
};
use rate_limit::service::{RateLimitState, ServiceSettings};

use crate::repositories::action::{ActionRepository, ActionRepositoryStorage};
use crate::repositories::action_intent::{ActionIntentRepository, ActionIntentRepositoryStorage};
use crate::repositories::intent::{IntentRepository, IntentRepositoryStorage};
use crate::repositories::intent_transaction::{
    IntentTransactionRepository, IntentTransactionRepositoryStorage,
};
use crate::repositories::link::{LinkRepository, LinkRepositoryStorage};
use crate::repositories::link_action::{LinkActionRepository, LinkActionRepositoryStorage};
use crate::repositories::processing_transaction::{
    ProcessingTransactionRepository, ProcessingTransactionRepositoryStorage,
};
use crate::repositories::request_lock::{RequestLockRepository, RequestLockRepositoryStorage};
use crate::repositories::transaction::{TransactionRepository, TransactionRepositoryStorage};
use crate::repositories::user::{UserRepository, UserRepositoryStorage};
use crate::repositories::user_action::{UserActionRepository, UserActionRepositoryStorage};
use crate::repositories::user_link::{UserLinkRepository, UserLinkRepositoryStorage};
use crate::repositories::user_wallet::{UserWalletRepository, UserWalletRepositoryStorage};

pub mod action;
pub mod action_intent;
pub mod intent;
pub mod intent_transaction;
pub mod link;
pub mod link_action;
pub mod processing_transaction;
pub mod request_lock;
pub mod transaction;
pub mod user;
pub mod user_action;
pub mod user_link;
pub mod user_wallet;

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
const LOG_SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(26);

// Unused Memory IDs but it used before, due to canister doesn't support shrink allocated memory
const _UNUSED_MEMORY_ID_00: MemoryId = MemoryId::new(0);
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

/// A trait for accessing repositories
pub trait Repositories {
    type ActionIntent: Storage<ActionIntentRepositoryStorage>;
    type Action: Storage<ActionRepositoryStorage>;
    type Intent: Storage<IntentRepositoryStorage>;
    type IntentTransaction: Storage<IntentTransactionRepositoryStorage>;
    type Link: Storage<LinkRepositoryStorage>;
    type LinkAction: Storage<LinkActionRepositoryStorage>;
    type ProcessingTransaction: Storage<ProcessingTransactionRepositoryStorage>;
    type RequestLock: Storage<RequestLockRepositoryStorage>;
    type Transaction: Storage<TransactionRepositoryStorage>;
    type User: Storage<UserRepositoryStorage>;
    type UserAction: Storage<UserActionRepositoryStorage>;
    type UserLink: Storage<UserLinkRepositoryStorage>;
    type UserWallet: Storage<UserWalletRepositoryStorage>;

    fn action_intent(&self) -> ActionIntentRepository<Self::ActionIntent>;
    fn action(&self) -> ActionRepository<Self::Action>;
    fn intent(&self) -> IntentRepository<Self::Intent>;
    fn intent_transaction(&self) -> IntentTransactionRepository<Self::IntentTransaction>;
    fn link(&self) -> LinkRepository<Self::Link>;
    fn link_action(&self) -> LinkActionRepository<Self::LinkAction>;
    fn processing_transaction(
        &self,
    ) -> ProcessingTransactionRepository<Self::ProcessingTransaction>;
    fn request_lock(&self) -> RequestLockRepository<Self::RequestLock>;
    fn transaction(&self) -> TransactionRepository<Self::Transaction>;
    fn user(&self) -> UserRepository<Self::User>;
    fn user_action(&self) -> UserActionRepository<Self::UserAction>;
    fn user_link(&self) -> UserLinkRepository<Self::UserLink>;
    fn user_wallet(&self) -> UserWalletRepository<Self::UserWallet>;
}

/// A factory for creating repositories backed by thread-local storage
pub struct ThreadlocalRepositories;

impl Repositories for ThreadlocalRepositories {
    type ActionIntent = &'static LocalKey<RefCell<ActionIntentRepositoryStorage>>;
    type Action = &'static LocalKey<RefCell<ActionRepositoryStorage>>;
    type Intent = &'static LocalKey<RefCell<IntentRepositoryStorage>>;
    type IntentTransaction = &'static LocalKey<RefCell<IntentTransactionRepositoryStorage>>;
    type Link = &'static LocalKey<RefCell<LinkRepositoryStorage>>;
    type LinkAction = &'static LocalKey<RefCell<LinkActionRepositoryStorage>>;
    type ProcessingTransaction = &'static LocalKey<RefCell<ProcessingTransactionRepositoryStorage>>;
    type RequestLock = &'static LocalKey<RefCell<RequestLockRepositoryStorage>>;
    type Transaction = &'static LocalKey<RefCell<TransactionRepositoryStorage>>;
    type User = &'static LocalKey<RefCell<UserRepositoryStorage>>;
    type UserAction = &'static LocalKey<RefCell<UserActionRepositoryStorage>>;
    type UserLink = &'static LocalKey<RefCell<UserLinkRepositoryStorage>>;
    type UserWallet = &'static LocalKey<RefCell<UserWalletRepositoryStorage>>;

    fn action_intent(&self) -> ActionIntentRepository<Self::ActionIntent> {
        ActionIntentRepository::new(&ACTION_INTENT_STORE)
    }

    fn action(&self) -> ActionRepository<Self::Action> {
        ActionRepository::new(&ACTION_STORE)
    }

    fn intent(&self) -> IntentRepository<Self::Intent> {
        IntentRepository::new(&INTENT_STORE)
    }

    fn intent_transaction(&self) -> IntentTransactionRepository<Self::IntentTransaction> {
        IntentTransactionRepository::new(&INTENT_TRANSACTION_STORE)
    }

    fn link(&self) -> LinkRepository<Self::Link> {
        LinkRepository::new(&LINK_STORE)
    }

    fn link_action(&self) -> LinkActionRepository<Self::LinkAction> {
        LinkActionRepository::new(&LINK_ACTION_STORE)
    }

    fn processing_transaction(
        &self,
    ) -> ProcessingTransactionRepository<Self::ProcessingTransaction> {
        ProcessingTransactionRepository::new(&PROCESSING_TRANSACTION_STORE)
    }

    fn request_lock(&self) -> RequestLockRepository<Self::RequestLock> {
        RequestLockRepository::new(&REQUEST_LOCK_STORE)
    }

    fn transaction(&self) -> TransactionRepository<Self::Transaction> {
        TransactionRepository::new(&TRANSACTION_STORE)
    }

    fn user(&self) -> UserRepository<Self::User> {
        UserRepository::new(&USER_STORE)
    }

    fn user_action(&self) -> UserActionRepository<Self::UserAction> {
        UserActionRepository::new(&USER_ACTION_STORE)
    }

    fn user_link(&self) -> UserLinkRepository<Self::UserLink> {
        UserLinkRepository::new(&USER_LINK_STORE)
    }

    fn user_wallet(&self) -> UserWalletRepository<Self::UserWallet> {
        UserWalletRepository::new(&USER_WALLET_STORE)
    }
}

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Store the logger settings
    pub static LOGGER_SERVICE_STORE: RefCell<LoggerServiceStorage> =
        RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LOG_SETTINGS_MEMORY_ID)),
                LogSettings::default(),
            )
        );

    // Thread-local storage for the rate limit state
    pub static RATE_LIMIT_STATE: RefCell<RateLimitStateStoreRunetime> = RefCell::new({
        RateLimitState::new(ServiceSettings::new(Duration::from_secs(60 * 60)))
    });

    static USER_STORE: RefCell<StableBTreeMap<
        UserKey,
        User,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)),
        )
    );

    static USER_WALLET_STORE: RefCell<StableBTreeMap<
        UserWalletKey,
        UserWallet,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_WALLET_MEMORY_ID)),
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

    static USER_ACTION_STORE: RefCell<StableBTreeMap<
        String,
        UserAction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_ACTION_MEMORY_ID)),
        )
    );

    static LINK_STORE: RefCell<StableBTreeMap<
        LinkKey,
        Link,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
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

    static ACTION_STORE: RefCell<StableBTreeMap<
        ActionKey,
        Action,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_MEMORY_ID)),
        )
    );

    static ACTION_INTENT_STORE: RefCell<StableBTreeMap<
        String,
        ActionIntent,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_INTENT_MEMORY_ID)),
        )
    );

    static INTENT_STORE: RefCell<StableBTreeMap<
        String,
        IntentV2,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_MEMORY_ID)),
        )
    );

    static INTENT_TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        IntentTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_TRANSACTION_MEMORY_ID)),
        )
    );

    static TRANSACTION_STORE: RefCell<StableBTreeMap<
        TransactionKey,
        TransactionV2,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)),
        )
    );

    static PROCESSING_TRANSACTION_STORE: RefCell<StableBTreeMap<
        String,
        ProcessingTransaction,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(PROCESSING_TRANSACTION_MEMORY_ID)),
        )
    );

    static REQUEST_LOCK_STORE: RefCell<StableBTreeMap<
        RequestLockKey,
        RequestLock,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(REQUEST_LOCK_MEMORY_ID))),
    );
}

#[cfg(test)]
pub mod tests {

    use std::rc::Rc;

    use super::*;

    /// A struct for testing Repositories and services
    pub struct TestRepositories {
        action_intent: Rc<RefCell<ActionIntentRepositoryStorage>>,
        action: Rc<RefCell<ActionRepositoryStorage>>,
        intent: Rc<RefCell<IntentRepositoryStorage>>,
        intent_transaction: Rc<RefCell<IntentTransactionRepositoryStorage>>,
        link: Rc<RefCell<LinkRepositoryStorage>>,
        link_action: Rc<RefCell<LinkActionRepositoryStorage>>,
        processing_transaction: Rc<RefCell<ProcessingTransactionRepositoryStorage>>,
        request_lock: Rc<RefCell<RequestLockRepositoryStorage>>,
        transaction: Rc<RefCell<TransactionRepositoryStorage>>,
        user: Rc<RefCell<UserRepositoryStorage>>,
        user_action: Rc<RefCell<UserActionRepositoryStorage>>,
        user_link: Rc<RefCell<UserLinkRepositoryStorage>>,
        user_wallet: Rc<RefCell<UserWalletRepositoryStorage>>,
    }

    impl TestRepositories {
        /// Create a new instance of TestRepositories.
        ///
        /// This is a testing-only implementation of Repositories, which uses an
        /// isolated non thread-local storage.
        pub fn new() -> Self {
            let mm = MemoryManager::init(DefaultMemoryImpl::default());
            Self {
                action_intent: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(ACTION_INTENT_MEMORY_ID),
                ))),
                action: Rc::new(RefCell::new(StableBTreeMap::init(mm.get(ACTION_MEMORY_ID)))),
                intent: Rc::new(RefCell::new(StableBTreeMap::init(mm.get(INTENT_MEMORY_ID)))),
                intent_transaction: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(INTENT_TRANSACTION_MEMORY_ID),
                ))),
                link: Rc::new(RefCell::new(StableBTreeMap::init(mm.get(LINK_MEMORY_ID)))),
                link_action: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(LINK_ACTION_MEMORY_ID),
                ))),
                processing_transaction: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(PROCESSING_TRANSACTION_MEMORY_ID),
                ))),
                request_lock: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(REQUEST_LOCK_MEMORY_ID),
                ))),
                transaction: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(TRANSACTION_MEMORY_ID),
                ))),
                user: Rc::new(RefCell::new(StableBTreeMap::init(mm.get(USER_MEMORY_ID)))),
                user_action: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(USER_ACTION_MEMORY_ID),
                ))),
                user_link: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(USER_LINK_MEMORY_ID),
                ))),
                user_wallet: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(USER_WALLET_MEMORY_ID),
                ))),
            }
        }
    }

    impl Repositories for TestRepositories {
        type ActionIntent = Rc<RefCell<ActionIntentRepositoryStorage>>;
        type Action = Rc<RefCell<ActionRepositoryStorage>>;
        type Intent = Rc<RefCell<IntentRepositoryStorage>>;
        type IntentTransaction = Rc<RefCell<IntentTransactionRepositoryStorage>>;
        type Link = Rc<RefCell<LinkRepositoryStorage>>;
        type LinkAction = Rc<RefCell<LinkActionRepositoryStorage>>;
        type ProcessingTransaction = Rc<RefCell<ProcessingTransactionRepositoryStorage>>;
        type RequestLock = Rc<RefCell<RequestLockRepositoryStorage>>;
        type Transaction = Rc<RefCell<TransactionRepositoryStorage>>;
        type User = Rc<RefCell<UserRepositoryStorage>>;
        type UserAction = Rc<RefCell<UserActionRepositoryStorage>>;
        type UserLink = Rc<RefCell<UserLinkRepositoryStorage>>;
        type UserWallet = Rc<RefCell<UserWalletRepositoryStorage>>;

        fn action_intent(&self) -> ActionIntentRepository<Self::ActionIntent> {
            ActionIntentRepository::new(self.action_intent.clone())
        }

        fn action(&self) -> ActionRepository<Self::Action> {
            ActionRepository::new(self.action.clone())
        }

        fn intent(&self) -> IntentRepository<Self::Intent> {
            IntentRepository::new(self.intent.clone())
        }

        fn intent_transaction(&self) -> IntentTransactionRepository<Self::IntentTransaction> {
            IntentTransactionRepository::new(self.intent_transaction.clone())
        }

        fn link(&self) -> LinkRepository<Self::Link> {
            LinkRepository::new(self.link.clone())
        }

        fn link_action(&self) -> LinkActionRepository<Self::LinkAction> {
            LinkActionRepository::new(self.link_action.clone())
        }

        fn processing_transaction(
            &self,
        ) -> ProcessingTransactionRepository<Self::ProcessingTransaction> {
            ProcessingTransactionRepository::new(self.processing_transaction.clone())
        }

        fn request_lock(&self) -> RequestLockRepository<Self::RequestLock> {
            RequestLockRepository::new(self.request_lock.clone())
        }

        fn transaction(&self) -> TransactionRepository<Self::Transaction> {
            TransactionRepository::new(self.transaction.clone())
        }

        fn user(&self) -> UserRepository<Self::User> {
            UserRepository::new(self.user.clone())
        }

        fn user_action(&self) -> UserActionRepository<Self::UserAction> {
            UserActionRepository::new(self.user_action.clone())
        }

        fn user_link(&self) -> UserLinkRepository<Self::UserLink> {
            UserLinkRepository::new(self.user_link.clone())
        }

        fn user_wallet(&self) -> UserWalletRepository<Self::UserWallet> {
            UserWalletRepository::new(self.user_wallet.clone())
        }
    }
}
