// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::intent::v2::Intent;

use crate::repositories::INTENT_STORE;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct IntentRepository {}

#[cfg_attr(test, faux::methods)]
impl Default for IntentRepository {
    fn default() -> Self {
        Self::new()
    }
}

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
        INTENT_STORE.with_borrow(|store| store.get(&id))
    }

    pub fn batch_get(&self, ids: Vec<String>) -> Vec<Intent> {
        INTENT_STORE.with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
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
