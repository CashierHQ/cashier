// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{
    keys::LinkKey,
    link::v3::{LinkCodecV3, LinkV3},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type LinkV3RepositoryStorage =
    VersionedBTreeMap<String, LinkV3, LinkCodecV3, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct LinkV3Repository<S: Storage<LinkV3RepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkV3RepositoryStorage>> LinkV3Repository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }
    pub fn create(&mut self, link: LinkV3) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<LinkV3> {
        self.storage.with_borrow(|store| store.get(id))
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<LinkV3> {
        self.storage
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn update(&mut self, link: LinkV3) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }
}
