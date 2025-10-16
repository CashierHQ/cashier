// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use token_storage_types::user::{UserPreference, UserPreferenceCodec};

/// Store for UserPreferenceRepository
pub type UserPreferenceRepositoryStorage = VersionedBTreeMap<
    Principal,
    UserPreference,
    UserPreferenceCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalUserPreferenceRepositoryStorage =
    &'static LocalKey<RefCell<UserPreferenceRepositoryStorage>>;

pub struct UserPreferenceRepository<S: Storage<UserPreferenceRepositoryStorage>> {
    user_pref_storage: S,
}

impl<S: Storage<UserPreferenceRepositoryStorage>> UserPreferenceRepository<S> {
    /// Create a new UserPreferenceRepository
    pub fn new(storage: S) -> Self {
        Self {
            user_pref_storage: storage,
        }
    }

    pub fn get(&self, id: &Principal) -> UserPreference {
        self.user_pref_storage
            .with_borrow(|store| store.get(id))
            .unwrap_or_default()
    }

    pub fn update(&mut self, id: Principal, user_preference: UserPreference) {
        self.user_pref_storage.with_borrow_mut(|store| {
            store.insert(id, user_preference);
        });
    }
}
