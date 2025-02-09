use crate::{info, repositories::ACTION_INTENT_STORE};
use cashier_types::{ActionIntent, ActionIntentKey, StorableActionIntentKey};

use super::base_repository::Store;

pub fn create(action_intent: ActionIntent) {
    ACTION_INTENT_STORE.with_borrow_mut(|store| {
        let key: StorableActionIntentKey = (
            action_intent.action_id.clone(),
            action_intent.intent_id.clone(),
        )
            .into();

        let reverse_key: StorableActionIntentKey = (
            action_intent.intent_id.clone(),
            action_intent.action_id.clone(),
        )
            .into();
        store.insert(key, action_intent.clone());
        store.insert(reverse_key, action_intent);
    });
}

pub fn batch_create(action_intents: Vec<ActionIntent>) {
    ACTION_INTENT_STORE.with_borrow_mut(|store| {
        for action_intent in action_intents {
            let key: StorableActionIntentKey = (
                action_intent.action_id.clone(),
                action_intent.intent_id.clone(),
            )
                .into();

            let reverse_key: StorableActionIntentKey = (
                action_intent.intent_id.clone(),
                action_intent.action_id.clone(),
            )
                .into();

            store.insert(key, action_intent.clone());
            store.insert(reverse_key, action_intent);
        }
    });
}

pub fn get(action_intent_key: ActionIntentKey) -> Option<ActionIntent> {
    ACTION_INTENT_STORE.with_borrow(|store| store.get(&action_intent_key.into()).clone())
}

pub fn get_by_action_id(action_id: String) -> Vec<ActionIntent> {
    ACTION_INTENT_STORE.with_borrow(|store| {
        let key = (action_id.clone(), "".to_string());
        store
            .get_range(key.into(), None)
            .iter()
            // .filter(|tx| return tx.action_id.clone() == action_id)
            .map(|v| v.clone())
            .collect()
    })
}

pub fn get_by_intent_id(intent_id: String) -> Vec<ActionIntent> {
    ACTION_INTENT_STORE.with_borrow(|store| {
        let key = (intent_id.clone(), "".to_string());
        store
            .get_range(key.into(), None)
            .iter()
            // .filter(|tx| return tx.intent_id.clone() == intent_id)
            .map(|v| v.clone())
            .collect()
    })
}

pub fn update(action_intent: ActionIntent) {
    ACTION_INTENT_STORE.with_borrow_mut(|store| {
        let key = (
            action_intent.action_id.clone(),
            action_intent.intent_id.clone(),
        );
        store.insert(key.into(), action_intent);
    });
}
