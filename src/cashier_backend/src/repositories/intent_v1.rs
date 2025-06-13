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

use cashier_types::{intent::v1::Intent, VersionedIntent};

use super::VERSIONED_INTENT_STORE;

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct IntentRepository {}

#[cfg_attr(test, faux::methods)]
impl IntentRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, intent: Intent) {
        VERSIONED_INTENT_STORE.with_borrow_mut(|store| {
            let id = intent.id.clone();
            let versioned_intent = VersionedIntent::build(CURRENT_DATA_VERSION, intent)
                .expect("Failed to create versioned intent");
            store.insert(id, versioned_intent);
        });
    }

    pub fn batch_create(&self, intents: Vec<Intent>) {
        VERSIONED_INTENT_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                let versioned_intent = VersionedIntent::build(CURRENT_DATA_VERSION, intent)
                    .expect("Failed to create versioned intent");
                store.insert(id, versioned_intent);
            }
        });
    }

    pub fn batch_update(&self, intents: Vec<Intent>) {
        VERSIONED_INTENT_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                let versioned_intent = VersionedIntent::build(CURRENT_DATA_VERSION, intent)
                    .expect("Failed to create versioned intent");
                store.insert(id, versioned_intent);
            }
        });
    }

    pub fn get(&self, id: String) -> Option<Intent> {
        VERSIONED_INTENT_STORE.with_borrow(|store| {
            store
                .get(&id)
                .map(|versioned_intent| versioned_intent.into_intent())
        })
    }

    pub fn batch_get(&self, ids: Vec<String>) -> Vec<Intent> {
        VERSIONED_INTENT_STORE.with_borrow(|store| {
            ids.into_iter()
                .filter_map(|id| store.get(&id))
                .map(|versioned_intent| versioned_intent.into_intent())
                .collect()
        })
    }

    pub fn update(&self, intent: Intent) {
        VERSIONED_INTENT_STORE.with_borrow_mut(|store| {
            let id = intent.id.clone();
            let versioned_intent = VersionedIntent::build(CURRENT_DATA_VERSION, intent)
                .expect("Failed to create versioned intent");
            store.insert(id, versioned_intent);
        });
    }

    pub fn delete(&self, id: &String) {
        VERSIONED_INTENT_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
