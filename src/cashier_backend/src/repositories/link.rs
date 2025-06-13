// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use super::VERSIONED_LINK_STORE;
use cashier_types::{versioned::VersionedLink, Link, LinkKey};

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
