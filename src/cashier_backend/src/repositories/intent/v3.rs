// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::intent::v3::{IntentCodecV3, IntentV3};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type IntentV3RepositoryStorage =
    VersionedBTreeMap<String, IntentV3, IntentCodecV3, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct IntentV3Repository<S: Storage<IntentV3RepositoryStorage>> {
    storage: S,
}

impl<S: Storage<IntentV3RepositoryStorage>> IntentV3Repository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn batch_create(&mut self, intents: Vec<IntentV3>) {
        self.storage.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn batch_update(&mut self, intents: Vec<IntentV3>) {
        self.storage.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn get(&self, id: &str) -> Option<IntentV3> {
        self.storage.with_borrow(|store| store.get(&id.to_string()))
    }
}
