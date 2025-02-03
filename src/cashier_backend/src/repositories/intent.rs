use cashier_types::Intent;

use super::{base_repository::Store, INTENT_STORE};

pub fn create(intent: Intent) {
    INTENT_STORE.with_borrow_mut(|store| {
        let id = intent.id.clone();
        store.insert(id, intent);
    });
}

pub fn batch_create(intents: Vec<Intent>) {
    INTENT_STORE.with_borrow_mut(|store| {
        for intent in intents {
            let id = intent.id.clone();
            store.insert(id, intent);
        }
    });
}

pub fn get(id: String) -> Option<Intent> {
    INTENT_STORE.with_borrow(|store| store.get(&id).clone())
}

pub fn get_batch(ids: Vec<String>) -> Vec<Intent> {
    INTENT_STORE.with_borrow(|store| store.batch_get(ids))
}

pub fn update(intent: Intent) {
    INTENT_STORE.with_borrow_mut(|store| {
        let id = intent.id.clone();
        store.insert(id, intent);
    });
}
