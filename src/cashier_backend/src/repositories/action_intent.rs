// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::{action_intent::v1::ActionIntent, keys::ActionIntentKey};

use super::ACTION_INTENT_STORE;

#[derive(Clone)]
pub struct ActionIntentRepository {}

impl Default for ActionIntentRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionIntentRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn batch_create(&self, action_intents: Vec<ActionIntent>) {
        ACTION_INTENT_STORE.with_borrow_mut(|store| {
            for action_intent in action_intents {
                let key: ActionIntentKey = ActionIntentKey {
                    action_id: action_intent.action_id.clone(),
                    intent_id: action_intent.intent_id.clone(),
                };

                store.insert(key.to_str(), action_intent.clone());
                store.insert(key.to_str_reverse(), action_intent);
            }
        });
    }

    pub fn get_by_action_id(&self, action_id: &str) -> Vec<ActionIntent> {
        ACTION_INTENT_STORE.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id: action_id.to_string(),
                intent_id: "".to_string(),
            };

            let prefix = key.to_str();

            let action_intents = store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, action_intent)| action_intent)
                .collect();

            action_intents
        })
    }

    pub fn get_by_intent_id(&self, intent_id: &str) -> Vec<ActionIntent> {
        ACTION_INTENT_STORE.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id: "".to_string(),
                intent_id: intent_id.to_string(),
            };

            let prefix = key.to_str_reverse();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, action_intent)| action_intent)
                .collect()
        })
    }
}
