use crate::repositories::ACTION_INTENT_STORE;
use cashier_types::{ActionIntent, ActionIntentKey};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct ActionIntentRepository {}
#[cfg_attr(test, faux::methods)]

impl ActionIntentRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, action_intent: ActionIntent) {
        ACTION_INTENT_STORE.with_borrow_mut(|store| {
            let key: ActionIntentKey = ActionIntentKey {
                action_id: action_intent.action_id.clone(),
                intent_id: action_intent.intent_id.clone(),
            };

            store.insert(key.to_str(), action_intent.clone());
            store.insert(key.to_str_reverse(), action_intent.clone());
        });
    }

    pub fn batch_create(&self, action_intents: Vec<ActionIntent>) {
        ACTION_INTENT_STORE.with_borrow_mut(|store| {
            for action_intent in action_intents {
                let key: ActionIntentKey = ActionIntentKey {
                    action_id: action_intent.action_id.clone(),
                    intent_id: action_intent.intent_id.clone(),
                };

                store.insert(key.to_str(), action_intent.clone());
                store.insert(key.to_str_reverse(), action_intent.clone());
            }
        });
    }

    pub fn get(&self, action_intent_key: ActionIntentKey) -> Option<ActionIntent> {
        ACTION_INTENT_STORE.with_borrow(|store| store.get(&action_intent_key.to_str()).clone())
    }

    pub fn get_by_action_id(&self, action_id: String) -> Vec<ActionIntent> {
        ACTION_INTENT_STORE.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id: action_id.clone(),
                intent_id: "".to_string(),
            };

            let prefix = key.to_str().clone();

            let action_intents = store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.clone())
                .collect();

            return action_intents;
        })
    }

    pub fn get_by_intent_id(&self, intent_id: String) -> Vec<ActionIntent> {
        ACTION_INTENT_STORE.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id: "".to_string(),
                intent_id: intent_id.clone(),
            };

            let prefix = key.to_str_reverse();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.clone())
                .collect()
        })
    }

    pub fn update(&self, action_intent: ActionIntent) {
        ACTION_INTENT_STORE.with_borrow_mut(|store| {
            let key = ActionIntentKey {
                action_id: action_intent.action_id.clone(),
                intent_id: action_intent.intent_id.clone(),
            };
            store.insert(key.to_str(), action_intent);
        });
    }
}
