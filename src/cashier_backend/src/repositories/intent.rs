use super::{base_repository::Store, INTENT_STORE};
use cashier_types::Intent;

pub struct IntentRepository {}

impl IntentRepository {
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
}

impl Default for IntentRepository {
    fn default() -> Self {
        IntentRepository {}
    }
}
