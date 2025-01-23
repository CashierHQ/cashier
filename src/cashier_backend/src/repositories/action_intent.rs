use crate::repositories::ACTION_INTENT_STORE;
use cashier_types::{ActionIntent, ActionIntentKey};

pub fn create(action_intent: ActionIntent) {
    ACTION_INTENT_STORE.with_borrow_mut(|store| {
        store.insert(
            (
                action_intent.action_id.clone(),
                action_intent.intent_id.clone(),
            ),
            action_intent,
        );
    });
}

pub fn get(action_intent_key: &ActionIntentKey) -> Option<ActionIntent> {
    ACTION_INTENT_STORE.with_borrow(|store| store.get(action_intent_key).clone())
}

pub fn update(action_intent: ActionIntent) {
    ACTION_INTENT_STORE.with_borrow_mut(|store| {
        let key = (
            action_intent.action_id.clone(),
            action_intent.intent_id.clone(),
        );
        store.insert(key, action_intent);
    });
}
