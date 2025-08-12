// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::LINK_STORE;
use cashier_backend_types::repository::{keys::LinkKey, link::v1::Link};

#[derive(Clone)]

pub struct LinkRepository {}

impl Default for LinkRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl LinkRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, link: Link) {
        LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<Link> {
        LINK_STORE.with_borrow(|store| store.get(id))
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<Link> {
        LINK_STORE.with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn update(&self, link: Link) {
        LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn delete(&self, id: &LinkKey) {
        LINK_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
