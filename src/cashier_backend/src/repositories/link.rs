// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use super::VERSIONED_LINK_STORE;
use cashier_types::{Link, LinkKey, VersionedLink};

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct LinkRepository {}

#[cfg_attr(test, faux::methods)]
impl LinkRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, link: Link) {
        VERSIONED_LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            let versioned_link = VersionedLink::build(CURRENT_DATA_VERSION, link)
                .expect("Failed to create versioned link");
            store.insert(id, versioned_link);
        });
    }

    pub fn batch_create(&self, links: Vec<Link>) {
        VERSIONED_LINK_STORE.with_borrow_mut(|store| {
            for link in links {
                let id: LinkKey = link.id.clone();
                let versioned_link = VersionedLink::build(CURRENT_DATA_VERSION, link)
                    .expect("Failed to create versioned link");
                store.insert(id, versioned_link);
            }
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<Link> {
        VERSIONED_LINK_STORE.with_borrow(|store| {
            store
                .get(id)
                .map(|versioned_link| versioned_link.into_link())
        })
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<Link> {
        VERSIONED_LINK_STORE.with_borrow(|store| {
            ids.into_iter()
                .filter_map(|id| store.get(&id))
                .map(|versioned_link| versioned_link.into_link())
                .collect()
        })
    }

    pub fn update(&self, link: Link) {
        VERSIONED_LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            let versioned_link = VersionedLink::build(CURRENT_DATA_VERSION, link)
                .expect("Failed to create versioned link");
            store.insert(id, versioned_link);
        });
    }

    pub fn delete(&self, id: &LinkKey) {
        VERSIONED_LINK_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
