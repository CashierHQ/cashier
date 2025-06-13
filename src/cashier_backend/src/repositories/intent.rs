// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use cashier_types::{intent::v2::Intent, VersionedIntent};

use crate::repositories::VERSIONED_INTENT_V2_STORE;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct IntentRepository {}

#[cfg_attr(test, faux::methods)]
impl IntentRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, intent: Intent) {
        VERSIONED_INTENT_V2_STORE.with_borrow_mut(|store| {
            let id = intent.id.clone();
            let versioned_intent =
                VersionedIntent::build_v2(intent).expect("Failed to create versioned intent");
            store.insert(id, versioned_intent);
        });
    }

    pub fn batch_create(&self, intents: Vec<Intent>) {
        VERSIONED_INTENT_V2_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                let versioned_intent =
                    VersionedIntent::build_v2(intent).expect("Failed to create versioned intent");
                store.insert(id, versioned_intent);
            }
        });
    }

    pub fn batch_update(&self, intents: Vec<Intent>) {
        VERSIONED_INTENT_V2_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                let versioned_intent =
                    VersionedIntent::build_v2(intent).expect("Failed to create versioned intent");
                store.insert(id, versioned_intent);
            }
        });
    }

    pub fn get(&self, id: String) -> Option<Intent> {
        VERSIONED_INTENT_V2_STORE.with_borrow(|store| {
            store
                .get(&id)
                .map(|versioned_intent| versioned_intent.to_v2())
        })
    }

    pub fn batch_get(&self, ids: Vec<String>) -> Vec<Intent> {
        VERSIONED_INTENT_V2_STORE.with_borrow(|store| {
            ids.into_iter()
                .filter_map(|id| store.get(&id))
                .map(|versioned_intent| versioned_intent.to_v2())
                .collect()
        })
    }

    pub fn update(&self, intent: Intent) {
        VERSIONED_INTENT_V2_STORE.with_borrow_mut(|store| {
            let id = intent.id.clone();
            let versioned_intent =
                VersionedIntent::build_v2(intent).expect("Failed to create versioned intent");
            store.insert(id, versioned_intent);
        });
    }

    pub fn delete(&self, id: &String) {
        VERSIONED_INTENT_V2_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
