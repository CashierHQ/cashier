pub mod gate;

use crate::{
    repositories::gate::{GateRepository, GateStorage, GateUserStatusStorage},
    services::auth::AuthServiceStorage,
};
use ic_mple_log::{
    LogSettings,
    service::{LoggerServiceStorage, Storage},
};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell};
use std::cell::RefCell;
use std::thread::LocalKey;

/// A trait for accessing repositories
pub trait Repositories {
    type Gate: Storage<GateStorage>;
    type GateUserStatus: Storage<GateUserStatusStorage>;

    fn gate(&self) -> GateRepository<Self::Gate, Self::GateUserStatus>;
}

/// A factory for creating repositories backed by thread-local storage
pub struct ThreadlocalRepositories;

impl Repositories for ThreadlocalRepositories {
    type Gate = &'static LocalKey<RefCell<GateStorage>>;
    type GateUserStatus = &'static LocalKey<RefCell<GateUserStatusStorage>>;

    fn gate(&self) -> GateRepository<Self::Gate, Self::GateUserStatus> {
        GateRepository::new(&GATE_STORAGE, &GATE_USER_STATUS_STORAGE)
    }
}

const GATE_MEMORY_ID: MemoryId = MemoryId::new(0);
const GATE_USER_STATUS_MEMORY_ID: MemoryId = MemoryId::new(1);
const AUTH_SERVICE_MEMORY_ID: MemoryId = MemoryId::new(2);
const LOG_SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(3);

thread_local! {
    // The memory manager is used for simulating multiple memories. Given a `MemoryId` it can
    // return a memory that can be used by stable structures.
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    /// Store for the auth service
    pub static AUTH_SERVICE_STORE: RefCell<AuthServiceStorage> =
    RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(AUTH_SERVICE_MEMORY_ID)),
        )
    );

    // Store for the logger settings
    pub static LOGGER_SERVICE_STORE: RefCell<LoggerServiceStorage> =
        RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LOG_SETTINGS_MEMORY_ID)),
                LogSettings::default(),
            )
        );

    // Initialized the stable structure memories
    static GATE_STORAGE: RefCell<GateStorage> = RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(GATE_MEMORY_ID)),
        ));

    static GATE_USER_STATUS_STORAGE: RefCell<GateUserStatusStorage> = RefCell::new(StableBTreeMap::init(
        MEMORY_MANAGER.with_borrow(|m| m.get(GATE_USER_STATUS_MEMORY_ID)),
    ));
}

#[cfg(any(test, feature = "canbench-rs"))]
pub mod tests {
    use super::*;
    use std::rc::Rc;

    /// A struct for testing Repositories and services
    pub struct TestRepositories {
        gate: Rc<RefCell<GateStorage>>,
        gate_user_status: Rc<RefCell<GateUserStatusStorage>>,
    }

    impl TestRepositories {
        /// Create a new instance of TestRepositories.
        ///
        /// This is a testing-only implementation of Repositories, which uses an
        /// isolated non thread-local storage.
        pub fn new() -> Self {
            let mm = MemoryManager::init(DefaultMemoryImpl::default());
            Self {
                gate: Rc::new(RefCell::new(StableBTreeMap::init(mm.get(GATE_MEMORY_ID)))),
                gate_user_status: Rc::new(RefCell::new(StableBTreeMap::init(
                    mm.get(GATE_USER_STATUS_MEMORY_ID),
                ))),
            }
        }
    }

    impl Repositories for TestRepositories {
        type Gate = Rc<RefCell<GateStorage>>;
        type GateUserStatus = Rc<RefCell<GateUserStatusStorage>>;

        fn gate(&self) -> GateRepository<Self::Gate, Self::GateUserStatus> {
            GateRepository::new(self.gate.clone(), self.gate_user_status.clone())
        }
    }
}
