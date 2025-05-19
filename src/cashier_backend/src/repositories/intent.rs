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

use super::{base_repository::Store, INTENT_STORE};
use cashier_types::Intent;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct IntentRepository {}

#[cfg_attr(test, faux::methods)]
impl IntentRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, intent: Intent) {
        INTENT_STORE.with_borrow_mut(|store| {
            let id = intent.id.clone();
            store.insert(id, intent);
        });
    }

    pub fn batch_create(&self, intents: Vec<Intent>) {
        INTENT_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn batch_update(&self, intents: Vec<Intent>) {
        INTENT_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn get(&self, id: String) -> Option<Intent> {
        INTENT_STORE.with_borrow(|store| store.get(&id).clone())
    }

    pub fn batch_get(&self, ids: Vec<String>) -> Vec<Intent> {
        INTENT_STORE.with_borrow(|store| store.batch_get(ids))
    }

    pub fn update(&self, intent: Intent) {
        INTENT_STORE.with_borrow_mut(|store| {
            let id = intent.id.clone();
            store.insert(id, intent);
        });
    }

    pub fn delete(&self, id: &String) {
        INTENT_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
