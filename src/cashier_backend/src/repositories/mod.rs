// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::cell::RefCell;
use std::thread::LocalKey;

use cashier_backend_types::repository::action::{
    v1::ActionCodec,
    v3::{ActionCodecV3, ActionV3},
};
use cashier_backend_types::repository::action_intent::v1::ActionIntentCodec;
use cashier_backend_types::repository::intent::{
    v1::IntentCodec,
    v3::{IntentCodecV3, IntentV3},
};
use cashier_backend_types::repository::intent_transaction::v1::IntentTransactionCodec;
use cashier_backend_types::repository::link::{
    v1::LinkCodec,
    v3::{LinkCodecV3, LinkV3},
};
use cashier_backend_types::repository::link_action::v1::LinkActionCodec;
use cashier_backend_types::repository::link_gate::LinkGateCodec;
use cashier_backend_types::repository::link_gate_user_status::LinkGateUserStatusCodec;
use cashier_backend_types::repository::transaction::v1::TransactionCodec;
use cashier_backend_types::repository::user_action::v1::UserActionCodec;
use cashier_backend_types::repository::user_link::v1::UserLinkCodec;
use cashier_backend_types::repository::user_link_action::v1::UserLinkActionCodec;
use ic_mple_log::LogSettings;
use ic_mple_log::service::{LoggerServiceStorage, Storage};
use ic_mple_structures::{VersionedBTreeMap, VersionedStableCell};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell};

use cashier_backend_types::repository::{
    action::v1::Action, action_intent::v1::ActionIntent, intent::v1::Intent,
    intent_transaction::v1::IntentTransaction, keys::*, link::v1::Link,
    link_action::v1::LinkAction, transaction::v1::Transaction, user_action::v1::UserAction,
    user_link::v1::UserLink,
};

use crate::repositories::action::{
    v1::{ActionRepository, ActionRepositoryStorage},
    v3::{ActionV3Repository, ActionV3RepositoryStorage},
};
use crate::repositories::action_intent::{ActionIntentRepository, ActionIntentRepositoryStorage};
use crate::repositories::auth::AuthServiceStorage;
use crate::repositories::backoff_config::{
    BackoffConfigRepository, BackoffConfigRepositoryStorage,
};
use crate::repositories::backoff_state::{BackoffStateRepository, BackoffStateRepositoryStorage};
use crate::repositories::intent::{
    v1::{IntentRepository, IntentRepositoryStorage},
    v3::{IntentV3Repository, IntentV3RepositoryStorage},
};
use crate::repositories::intent_transaction::{
    IntentTransactionRepository, IntentTransactionRepositoryStorage,
};
use crate::repositories::link::{
    v1::{LinkRepository, LinkRepositoryStorage},
    v3::{LinkV3Repository, LinkV3RepositoryStorage},
};
use crate::repositories::link_action::{LinkActionRepository, LinkActionRepositoryStorage};
use crate::repositories::link_gate::{LinkGateRepository, LinkGateRepositoryStorage};
use crate::repositories::link_gate_user_status::{
    LinkGateUserStatusRepository, LinkGateUserStatusRepositoryStorage,
};
use crate::repositories::link_reservation::{
    LinkReservationRepository, LinkReservationRepositoryStorage,
};
use crate::repositories::rate_limit_config::{
    RateLimitConfigRepository, RateLimitConfigRepositoryStorage,
};
use crate::repositories::rate_limit_state::{
    RateLimitStateRepository, RateLimitStateRepositoryStorage,
};
use crate::repositories::request_lock::{RequestLockRepository, RequestLockRepositoryStorage};
use crate::repositories::settings::{
    Settings, SettingsCodec, SettingsRepository, SettingsRepositoryStorage,
};
use crate::repositories::token_fee::{TokenFeeRepository, TokenFeeRepositoryStorage};
use crate::repositories::token_standard::{
    TokenStandardRepository, TokenStandardRepositoryStorage,
};
use crate::repositories::transaction::{TransactionRepository, TransactionRepositoryStorage};
use crate::repositories::user_action::{UserActionRepository, UserActionRepositoryStorage};
use crate::repositories::user_link::{UserLinkRepository, UserLinkRepositoryStorage};
use crate::repositories::user_link_action::{
    UserLinkActionRepository, UserLinkActionRepositoryStorage,
};

pub mod action;
pub mod action_intent;
pub mod auth;
pub mod backoff_config;
pub mod backoff_state;
pub mod intent;
pub mod intent_transaction;
pub mod link;
pub mod link_action;
pub mod link_gate;
pub mod link_gate_user_status;
pub mod link_reservation;
pub mod rate_limit_config;
pub mod rate_limit_state;
pub mod request_lock;
pub mod settings;
pub mod token_fee;
pub mod token_standard;
pub mod transaction;
pub mod user_action;
pub mod user_link;
pub mod user_link_action;

const INTENT_TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(0);
const TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(1);
const INTENT_MEMORY_ID: MemoryId = MemoryId::new(2);
const USER_LINK_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_ACTION_MEMORY_ID: MemoryId = MemoryId::new(4);
const LINK_MEMORY_ID: MemoryId = MemoryId::new(5);
const LINK_ACTION_MEMORY_ID: MemoryId = MemoryId::new(6);
const ACTION_MEMORY_ID: MemoryId = MemoryId::new(7);
const ACTION_INTENT_MEMORY_ID: MemoryId = MemoryId::new(8);
// MemoryId 10 retired (request_lock moved to volatile heap storage) - do not reuse.
const LOG_SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(11);
const AUTH_SERVICE_MEMORY_ID: MemoryId = MemoryId::new(12);
const SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(13);
const USER_LINK_ACTION_MEMORY_ID: MemoryId = MemoryId::new(14);
const LINK_V3_MEMORY_ID: MemoryId = MemoryId::new(15);
const ACTION_V3_MEMORY_ID: MemoryId = MemoryId::new(16);
const INTENT_V3_MEMORY_ID: MemoryId = MemoryId::new(17);
const LINK_GATE_MEMORY_ID: MemoryId = MemoryId::new(18);
const LINK_GATE_USER_STATUS_MEMORY_ID: MemoryId = MemoryId::new(19);
const RATE_LIMIT_CONFIG_MEMORY_ID: MemoryId = MemoryId::new(20);
const BACKOFF_CONFIG_MEMORY_ID: MemoryId = MemoryId::new(21);

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

/// A trait for accessing repositories
pub trait Repositories {
    type ActionIntent: Storage<ActionIntentRepositoryStorage>;
    type Action: Storage<ActionRepositoryStorage>;
    type Intent: Storage<IntentRepositoryStorage>;
    type IntentTransaction: Storage<IntentTransactionRepositoryStorage>;
    type Link: Storage<LinkRepositoryStorage>;
    type LinkAction: Storage<LinkActionRepositoryStorage>;
    type LinkReservation: Storage<LinkReservationRepositoryStorage>;
    type RequestLock: Storage<RequestLockRepositoryStorage>;
    type Settings: Storage<SettingsRepositoryStorage>;
    type TokenFee: Storage<TokenFeeRepositoryStorage>;
    type Transaction: Storage<TransactionRepositoryStorage>;
    type UserAction: Storage<UserActionRepositoryStorage>;
    type UserLink: Storage<UserLinkRepositoryStorage>;
    type UserLinkAction: Storage<UserLinkActionRepositoryStorage>;
    type LinkV3: Storage<LinkV3RepositoryStorage>;
    type ActionV3: Storage<ActionV3RepositoryStorage>;
    type IntentV3: Storage<IntentV3RepositoryStorage>;
    type TokenStandard: Storage<TokenStandardRepositoryStorage>;
    type LinkGate: Storage<LinkGateRepositoryStorage>;
    type LinkGateUserStatus: Storage<LinkGateUserStatusRepositoryStorage>;
    type RateLimitConfig: Storage<RateLimitConfigRepositoryStorage>;
    type RateLimitState: Storage<RateLimitStateRepositoryStorage>;
    type BackoffConfig: Storage<BackoffConfigRepositoryStorage>;
    type BackoffState: Storage<BackoffStateRepositoryStorage>;

    fn action_intent(&self) -> ActionIntentRepository<Self::ActionIntent>;
    fn action(&self) -> ActionRepository<Self::Action>;
    fn intent(&self) -> IntentRepository<Self::Intent>;
    fn intent_transaction(&self) -> IntentTransactionRepository<Self::IntentTransaction>;
    fn link(&self) -> LinkRepository<Self::Link>;
    fn link_action(&self) -> LinkActionRepository<Self::LinkAction>;
    fn link_reservation(&self) -> LinkReservationRepository<Self::LinkReservation>;
    fn request_lock(&self) -> RequestLockRepository<Self::RequestLock>;
    fn settings(&self) -> SettingsRepository<Self::Settings>;
    fn token_fee(&self) -> TokenFeeRepository<Self::TokenFee>;
    fn transaction(&self) -> TransactionRepository<Self::Transaction>;
    fn user_action(&self) -> UserActionRepository<Self::UserAction>;
    fn user_link(&self) -> UserLinkRepository<Self::UserLink>;
    fn user_link_action(&self) -> UserLinkActionRepository<Self::UserLinkAction>;
    fn link_v3(&self) -> LinkV3Repository<Self::LinkV3>;
    fn action_v3(&self) -> ActionV3Repository<Self::ActionV3>;
    fn intent_v3(&self) -> IntentV3Repository<Self::IntentV3>;
    fn token_standard(&self) -> TokenStandardRepository<Self::TokenStandard>;
    fn link_gate(&self) -> LinkGateRepository<Self::LinkGate>;
    fn link_gate_user_status(&self) -> LinkGateUserStatusRepository<Self::LinkGateUserStatus>;
    fn rate_limit_config(&self) -> RateLimitConfigRepository<Self::RateLimitConfig>;
    fn rate_limit_state(&self) -> RateLimitStateRepository<Self::RateLimitState>;
    fn backoff_config(&self) -> BackoffConfigRepository<Self::BackoffConfig>;
    fn backoff_state(&self) -> BackoffStateRepository<Self::BackoffState>;
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
    type LinkReservation = &'static LocalKey<RefCell<LinkReservationRepositoryStorage>>;
    type RequestLock = &'static LocalKey<RefCell<RequestLockRepositoryStorage>>;
    type Settings = &'static LocalKey<RefCell<SettingsRepositoryStorage>>;
    type TokenFee = &'static LocalKey<RefCell<TokenFeeRepositoryStorage>>;
    type Transaction = &'static LocalKey<RefCell<TransactionRepositoryStorage>>;
    type UserAction = &'static LocalKey<RefCell<UserActionRepositoryStorage>>;
    type UserLink = &'static LocalKey<RefCell<UserLinkRepositoryStorage>>;
    type UserLinkAction = &'static LocalKey<RefCell<UserLinkActionRepositoryStorage>>;
    type LinkV3 = &'static LocalKey<RefCell<LinkV3RepositoryStorage>>;
    type ActionV3 = &'static LocalKey<RefCell<ActionV3RepositoryStorage>>;
    type IntentV3 = &'static LocalKey<RefCell<IntentV3RepositoryStorage>>;
    type TokenStandard = &'static LocalKey<RefCell<TokenStandardRepositoryStorage>>;
    type LinkGate = &'static LocalKey<RefCell<LinkGateRepositoryStorage>>;
    type LinkGateUserStatus = &'static LocalKey<RefCell<LinkGateUserStatusRepositoryStorage>>;
    type RateLimitConfig = &'static LocalKey<RefCell<RateLimitConfigRepositoryStorage>>;
    type RateLimitState = &'static LocalKey<RefCell<RateLimitStateRepositoryStorage>>;
    type BackoffConfig = &'static LocalKey<RefCell<BackoffConfigRepositoryStorage>>;
    type BackoffState = &'static LocalKey<RefCell<BackoffStateRepositoryStorage>>;

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

    fn link_reservation(&self) -> LinkReservationRepository<Self::LinkReservation> {
        LinkReservationRepository::new(&LINK_RESERVATION_STORE)
    }

    fn request_lock(&self) -> RequestLockRepository<Self::RequestLock> {
        RequestLockRepository::new(&REQUEST_LOCK_STORE)
    }

    fn settings(&self) -> SettingsRepository<Self::Settings> {
        SettingsRepository::new(&SETTINGS_STORE)
    }

    fn token_fee(&self) -> TokenFeeRepository<Self::TokenFee> {
        TokenFeeRepository::new(&TOKEN_FEE_CACHE_STORE)
    }

    fn transaction(&self) -> TransactionRepository<Self::Transaction> {
        TransactionRepository::new(&TRANSACTION_STORE)
    }

    fn user_action(&self) -> UserActionRepository<Self::UserAction> {
        UserActionRepository::new(&USER_ACTION_STORE)
    }

    fn user_link(&self) -> UserLinkRepository<Self::UserLink> {
        UserLinkRepository::new(&USER_LINK_STORE)
    }

    fn user_link_action(&self) -> UserLinkActionRepository<Self::UserLinkAction> {
        UserLinkActionRepository::new(&USER_LINK_ACTION_STORE)
    }

    fn link_v3(&self) -> LinkV3Repository<Self::LinkV3> {
        LinkV3Repository::new(&LINK_V3_STORE)
    }

    fn action_v3(&self) -> ActionV3Repository<Self::ActionV3> {
        ActionV3Repository::new(&ACTION_V3_STORE)
    }

    fn intent_v3(&self) -> IntentV3Repository<Self::IntentV3> {
        IntentV3Repository::new(&INTENT_V3_STORE)
    }

    fn token_standard(&self) -> TokenStandardRepository<Self::TokenStandard> {
        TokenStandardRepository::new(&TOKEN_STANDARD_STORE)
    }

    fn link_gate(&self) -> LinkGateRepository<Self::LinkGate> {
        LinkGateRepository::new(&LINK_GATE_STORE)
    }

    fn link_gate_user_status(&self) -> LinkGateUserStatusRepository<Self::LinkGateUserStatus> {
        LinkGateUserStatusRepository::new(&LINK_GATE_USER_STATUS_STORE)
    }

    fn rate_limit_config(&self) -> RateLimitConfigRepository<Self::RateLimitConfig> {
        RateLimitConfigRepository::new(&RATE_LIMIT_CONFIG_STORE)
    }

    fn rate_limit_state(&self) -> RateLimitStateRepository<Self::RateLimitState> {
        RateLimitStateRepository::new(&RATE_LIMIT_STATE_STORE)
    }

    fn backoff_config(&self) -> BackoffConfigRepository<Self::BackoffConfig> {
        BackoffConfigRepository::new(&BACKOFF_CONFIG_STORE)
    }

    fn backoff_state(&self) -> BackoffStateRepository<Self::BackoffState> {
        BackoffStateRepository::new(&BACKOFF_STATE_STORE)
    }
}

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Store for the logger settings
    pub static LOGGER_SERVICE_STORE: RefCell<LoggerServiceStorage> =
        RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LOG_SETTINGS_MEMORY_ID)),
                LogSettings::default(),
            )
        );

        /// Store for the auth service
    pub static AUTH_SERVICE_STORE: RefCell<AuthServiceStorage> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(AUTH_SERVICE_MEMORY_ID)),
            )
        );


    static USER_LINK_STORE: RefCell<VersionedBTreeMap<
        String,
        UserLink,
        UserLinkCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_LINK_MEMORY_ID)),
        )
    );

    static USER_LINK_ACTION_STORE: RefCell<VersionedBTreeMap<
        String,
        Vec<LinkAction>,
        UserLinkActionCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_LINK_ACTION_MEMORY_ID)),
        )
    );

    static USER_ACTION_STORE: RefCell<VersionedBTreeMap<
        String,
        UserAction,
        UserActionCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_ACTION_MEMORY_ID)),
        )
    );

    static LINK_STORE: RefCell<VersionedBTreeMap<
        LinkKey,
        Link,
        LinkCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
        )
    );

    static LINK_ACTION_STORE: RefCell<VersionedBTreeMap<
        String,
        LinkAction,
        LinkActionCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_ACTION_MEMORY_ID)),
        )
    );

    static ACTION_STORE: RefCell<VersionedBTreeMap<
        ActionKey,
        Action,
        ActionCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_MEMORY_ID)),
        )
    );

    static ACTION_INTENT_STORE: RefCell<VersionedBTreeMap<
        String,
        ActionIntent,
        ActionIntentCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_INTENT_MEMORY_ID)),
        )
    );

    static INTENT_STORE: RefCell<VersionedBTreeMap<
        String,
        Intent,
        IntentCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_MEMORY_ID)),
        )
    );

    static INTENT_TRANSACTION_STORE: RefCell<VersionedBTreeMap<
        String,
        IntentTransaction,
        IntentTransactionCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_TRANSACTION_MEMORY_ID)),
        )
    );

    static TRANSACTION_STORE: RefCell<VersionedBTreeMap<
        TransactionKey,
        Transaction,
        TransactionCodec,
                Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TRANSACTION_MEMORY_ID)),
        )
    );

    /// Request locks - volatile BTreeMap (not persisted to stable memory):
    /// per-message anti-spam state, wiped on canister upgrade by design
    static REQUEST_LOCK_STORE: RefCell<RequestLockRepositoryStorage> =
        const { RefCell::new(std::collections::BTreeMap::new()) };

    /// Link reservations - volatile BTreeMap (not persisted to stable memory):
    static LINK_RESERVATION_STORE: RefCell<LinkReservationRepositoryStorage> =
        const { RefCell::new(std::collections::BTreeMap::new()) };

    static SETTINGS_STORE: RefCell<VersionedStableCell<
        Settings,
        SettingsCodec,
        Memory
    >> = RefCell::new(
        VersionedStableCell::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(SETTINGS_MEMORY_ID)),
            Settings::default(),
        )
    );

    /// Token fee cache - volatile BTreeMap (not persisted to stable memory)
    pub static TOKEN_FEE_CACHE_STORE: RefCell<TokenFeeRepositoryStorage> =
        const { RefCell::new(std::collections::BTreeMap::new()) };

    static LINK_V3_STORE: RefCell<VersionedBTreeMap<
        LinkKey,
        LinkV3,
        LinkCodecV3,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_V3_MEMORY_ID)),
        )
    );

    static ACTION_V3_STORE: RefCell<VersionedBTreeMap<
        ActionKey,
        ActionV3,
        ActionCodecV3,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(ACTION_V3_MEMORY_ID)),
        )
    );

    static INTENT_V3_STORE: RefCell<VersionedBTreeMap<
        String,
        IntentV3,
        IntentCodecV3,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(INTENT_V3_MEMORY_ID)),
        )
    );

    static TOKEN_STANDARD_STORE: RefCell<TokenStandardRepositoryStorage> =
        const { RefCell::new(std::collections::BTreeMap::new()) };

    static LINK_GATE_STORE: RefCell<VersionedBTreeMap<
        String,
        cashier_backend_types::repository::link_gate::LinkGate,
        LinkGateCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_GATE_MEMORY_ID)),
        )
    );

    static LINK_GATE_USER_STATUS_STORE: RefCell<VersionedBTreeMap<
        String,
        cashier_backend_types::repository::link_gate_user_status::LinkGateUserStatus,
        LinkGateUserStatusCodec,
        Memory
    >> = RefCell::new(
        VersionedBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(LINK_GATE_USER_STATUS_MEMORY_ID)),
        )
    );

    static RATE_LIMIT_CONFIG_STORE: RefCell<RateLimitConfigRepositoryStorage> =
        RefCell::new(
            VersionedStableCell::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(RATE_LIMIT_CONFIG_MEMORY_ID)),
                Default::default(),
            )
        );

    static BACKOFF_CONFIG_STORE: RefCell<BackoffConfigRepositoryStorage> =
        RefCell::new(
            VersionedStableCell::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(BACKOFF_CONFIG_MEMORY_ID)),
                Default::default(),
            )
        );
}

thread_local! {
    // Heap-based stores — intentionally volatile, reset on canister upgrade.
    pub(crate) static RATE_LIMIT_STATE_STORE: RefCell<RateLimitStateRepositoryStorage> =
        const { RefCell::new(std::collections::BTreeMap::new()) };

    pub(crate) static BACKOFF_STATE_STORE: RefCell<BackoffStateRepositoryStorage> =
        const { RefCell::new(std::collections::BTreeMap::new()) };
}

#[cfg(test)]
pub mod tests {

    use super::*;
    use std::rc::Rc;

    /// A struct for testing Repositories and services
    pub struct TestRepositories {
        action_intent: Rc<RefCell<ActionIntentRepositoryStorage>>,
        action: Rc<RefCell<ActionRepositoryStorage>>,
        intent: Rc<RefCell<IntentRepositoryStorage>>,
        intent_transaction: Rc<RefCell<IntentTransactionRepositoryStorage>>,
        link: Rc<RefCell<LinkRepositoryStorage>>,
        link_action: Rc<RefCell<LinkActionRepositoryStorage>>,
        link_reservation: Rc<RefCell<LinkReservationRepositoryStorage>>,
        request_lock: Rc<RefCell<RequestLockRepositoryStorage>>,
        settings: Rc<RefCell<SettingsRepositoryStorage>>,
        token_fee: Rc<RefCell<TokenFeeRepositoryStorage>>,
        transaction: Rc<RefCell<TransactionRepositoryStorage>>,
        user_action: Rc<RefCell<UserActionRepositoryStorage>>,
        user_link: Rc<RefCell<UserLinkRepositoryStorage>>,
        user_link_action: Rc<RefCell<UserLinkActionRepositoryStorage>>,
        link_v3: Rc<RefCell<LinkV3RepositoryStorage>>,
        action_v3: Rc<RefCell<ActionV3RepositoryStorage>>,
        intent_v3: Rc<RefCell<IntentV3RepositoryStorage>>,
        token_standard: Rc<RefCell<TokenStandardRepositoryStorage>>,
        link_gate: Rc<RefCell<LinkGateRepositoryStorage>>,
        link_gate_user_status: Rc<RefCell<LinkGateUserStatusRepositoryStorage>>,
        rate_limit_config: Rc<RefCell<RateLimitConfigRepositoryStorage>>,
        rate_limit_state: Rc<RefCell<RateLimitStateRepositoryStorage>>,
        backoff_config: Rc<RefCell<BackoffConfigRepositoryStorage>>,
        backoff_state: Rc<RefCell<BackoffStateRepositoryStorage>>,
    }

    impl TestRepositories {
        /// Create a new instance of TestRepositories.
        ///
        /// This is a testing-only implementation of Repositories, which uses an
        /// isolated non thread-local storage.
        pub fn new() -> Self {
            // Use 1-page (64 KiB) buckets so the backing Vec stays small on 32-bit targets.
            let mm = MemoryManager::init_with_bucket_size(DefaultMemoryImpl::default(), 1);
            Self {
                action_intent: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(ACTION_INTENT_MEMORY_ID),
                ))),
                action: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(ACTION_MEMORY_ID),
                ))),
                intent: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(INTENT_MEMORY_ID),
                ))),
                intent_transaction: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(INTENT_TRANSACTION_MEMORY_ID),
                ))),
                link: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(LINK_MEMORY_ID),
                ))),
                link_action: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(LINK_ACTION_MEMORY_ID),
                ))),
                link_reservation: Rc::new(RefCell::new(std::collections::BTreeMap::new())),
                request_lock: Rc::new(RefCell::new(std::collections::BTreeMap::new())),
                settings: Rc::new(RefCell::new(VersionedStableCell::init(
                    mm.get(SETTINGS_MEMORY_ID),
                    Default::default(),
                ))),
                token_fee: Rc::new(RefCell::new(std::collections::BTreeMap::new())),
                transaction: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(TRANSACTION_MEMORY_ID),
                ))),
                user_action: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(USER_ACTION_MEMORY_ID),
                ))),
                user_link: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(USER_LINK_MEMORY_ID),
                ))),
                user_link_action: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(USER_LINK_ACTION_MEMORY_ID),
                ))),
                link_v3: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(LINK_V3_MEMORY_ID),
                ))),
                action_v3: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(ACTION_V3_MEMORY_ID),
                ))),
                intent_v3: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(INTENT_V3_MEMORY_ID),
                ))),
                token_standard: Rc::new(RefCell::new(std::collections::BTreeMap::new())),
                link_gate: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(LINK_GATE_MEMORY_ID),
                ))),
                link_gate_user_status: Rc::new(RefCell::new(VersionedBTreeMap::init(
                    mm.get(LINK_GATE_USER_STATUS_MEMORY_ID),
                ))),
                rate_limit_config: Rc::new(RefCell::new(VersionedStableCell::init(
                    mm.get(RATE_LIMIT_CONFIG_MEMORY_ID),
                    Default::default(),
                ))),
                rate_limit_state: Rc::new(RefCell::new(std::collections::BTreeMap::new())),
                backoff_config: Rc::new(RefCell::new(VersionedStableCell::init(
                    mm.get(BACKOFF_CONFIG_MEMORY_ID),
                    Default::default(),
                ))),
                backoff_state: Rc::new(RefCell::new(std::collections::BTreeMap::new())),
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
        type LinkReservation = Rc<RefCell<LinkReservationRepositoryStorage>>;
        type RequestLock = Rc<RefCell<RequestLockRepositoryStorage>>;
        type Settings = Rc<RefCell<SettingsRepositoryStorage>>;
        type TokenFee = Rc<RefCell<TokenFeeRepositoryStorage>>;
        type Transaction = Rc<RefCell<TransactionRepositoryStorage>>;
        type UserAction = Rc<RefCell<UserActionRepositoryStorage>>;
        type UserLink = Rc<RefCell<UserLinkRepositoryStorage>>;
        type UserLinkAction = Rc<RefCell<UserLinkActionRepositoryStorage>>;
        type LinkV3 = Rc<RefCell<LinkV3RepositoryStorage>>;
        type ActionV3 = Rc<RefCell<ActionV3RepositoryStorage>>;
        type IntentV3 = Rc<RefCell<IntentV3RepositoryStorage>>;
        type TokenStandard = Rc<RefCell<TokenStandardRepositoryStorage>>;
        type LinkGate = Rc<RefCell<LinkGateRepositoryStorage>>;
        type LinkGateUserStatus = Rc<RefCell<LinkGateUserStatusRepositoryStorage>>;
        type RateLimitConfig = Rc<RefCell<RateLimitConfigRepositoryStorage>>;
        type RateLimitState = Rc<RefCell<RateLimitStateRepositoryStorage>>;
        type BackoffConfig = Rc<RefCell<BackoffConfigRepositoryStorage>>;
        type BackoffState = Rc<RefCell<BackoffStateRepositoryStorage>>;

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

        fn link_reservation(&self) -> LinkReservationRepository<Self::LinkReservation> {
            LinkReservationRepository::new(self.link_reservation.clone())
        }

        fn request_lock(&self) -> RequestLockRepository<Self::RequestLock> {
            RequestLockRepository::new(self.request_lock.clone())
        }

        fn settings(&self) -> SettingsRepository<Self::Settings> {
            SettingsRepository::new(self.settings.clone())
        }

        fn token_fee(&self) -> TokenFeeRepository<Self::TokenFee> {
            TokenFeeRepository::new(self.token_fee.clone())
        }

        fn transaction(&self) -> TransactionRepository<Self::Transaction> {
            TransactionRepository::new(self.transaction.clone())
        }

        fn user_action(&self) -> UserActionRepository<Self::UserAction> {
            UserActionRepository::new(self.user_action.clone())
        }

        fn user_link(&self) -> UserLinkRepository<Self::UserLink> {
            UserLinkRepository::new(self.user_link.clone())
        }

        fn user_link_action(&self) -> UserLinkActionRepository<Self::UserLinkAction> {
            UserLinkActionRepository::new(self.user_link_action.clone())
        }

        fn link_v3(&self) -> LinkV3Repository<Self::LinkV3> {
            LinkV3Repository::new(self.link_v3.clone())
        }

        fn action_v3(&self) -> ActionV3Repository<Self::ActionV3> {
            ActionV3Repository::new(self.action_v3.clone())
        }

        fn intent_v3(&self) -> IntentV3Repository<Self::IntentV3> {
            IntentV3Repository::new(self.intent_v3.clone())
        }

        fn token_standard(&self) -> TokenStandardRepository<Self::TokenStandard> {
            TokenStandardRepository::new(self.token_standard.clone())
        }

        fn link_gate(&self) -> LinkGateRepository<Self::LinkGate> {
            LinkGateRepository::new(self.link_gate.clone())
        }

        fn link_gate_user_status(&self) -> LinkGateUserStatusRepository<Self::LinkGateUserStatus> {
            LinkGateUserStatusRepository::new(self.link_gate_user_status.clone())
        }

        fn rate_limit_config(&self) -> RateLimitConfigRepository<Self::RateLimitConfig> {
            RateLimitConfigRepository::new(self.rate_limit_config.clone())
        }

        fn rate_limit_state(&self) -> RateLimitStateRepository<Self::RateLimitState> {
            RateLimitStateRepository::new(self.rate_limit_state.clone())
        }

        fn backoff_config(&self) -> BackoffConfigRepository<Self::BackoffConfig> {
            BackoffConfigRepository::new(self.backoff_config.clone())
        }

        fn backoff_state(&self) -> BackoffStateRepository<Self::BackoffState> {
            BackoffStateRepository::new(self.backoff_state.clone())
        }
    }
}
