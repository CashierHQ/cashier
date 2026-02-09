// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{
    action::v3::{ActionCodecV3, ActionV3},
    keys::ActionKey,
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type ActionV3RepositoryStorage =
    VersionedBTreeMap<ActionKey, ActionV3, ActionCodecV3, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct ActionV3Repository<S: Storage<ActionV3RepositoryStorage>> {
    storage: S,
}

impl<S: Storage<ActionV3RepositoryStorage>> ActionV3Repository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, action: ActionV3) {
        self.storage.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }

    pub fn get(&self, action_id: &str) -> Option<ActionV3> {
        self.storage
            .with_borrow(|store| store.get(&action_id.to_string()))
    }

    pub fn update(&mut self, action: ActionV3) {
        self.storage.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }
}
