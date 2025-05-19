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

use super::{base_repository::Store, LINK_STORE};
use cashier_types::{Link, LinkKey};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct LinkRepository {}

#[cfg_attr(test, faux::methods)]
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

    pub fn batch_create(&self, links: Vec<Link>) {
        LINK_STORE.with_borrow_mut(|store| {
            for link in links {
                let id: LinkKey = link.id.clone();
                store.insert(id, link);
            }
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<Link> {
        LINK_STORE.with_borrow(|store| store.get(&id))
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<Link> {
        LINK_STORE.with_borrow(|store| store.batch_get(ids))
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
