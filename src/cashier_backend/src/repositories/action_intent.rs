// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use cashier_types::{action_intent::v1::ActionIntent, ActionIntentKey, VersionedActionIntent};

use super::VERSIONED_ACTION_INTENT_STORE;

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct ActionIntentRepository {}
#[cfg_attr(test, faux::methods)]

impl ActionIntentRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, action_intent: ActionIntent) {
        VERSIONED_ACTION_INTENT_STORE.with_borrow_mut(|store| {
            let key: ActionIntentKey = ActionIntentKey {
                action_id: action_intent.action_id.clone(),
                intent_id: action_intent.intent_id.clone(),
            };

            let versioned_action_intent =
                VersionedActionIntent::build(CURRENT_DATA_VERSION, action_intent.clone())
                    .expect("Failed to create versioned action intent");
            store.insert(key.to_str(), versioned_action_intent.clone());
            store.insert(key.to_str_reverse(), versioned_action_intent);
        });
    }

    pub fn batch_create(&self, action_intents: Vec<ActionIntent>) {
        VERSIONED_ACTION_INTENT_STORE.with_borrow_mut(|store| {
            for action_intent in action_intents {
                let key: ActionIntentKey = ActionIntentKey {
                    action_id: action_intent.action_id.clone(),
                    intent_id: action_intent.intent_id.clone(),
                };

                let versioned_action_intent =
                    VersionedActionIntent::build(CURRENT_DATA_VERSION, action_intent.clone())
                        .expect("Failed to create versioned action intent");
                store.insert(key.to_str(), versioned_action_intent.clone());
                store.insert(key.to_str_reverse(), versioned_action_intent);
            }
        });
    }

    pub fn get(&self, action_intent_key: ActionIntentKey) -> Option<ActionIntent> {
        VERSIONED_ACTION_INTENT_STORE.with_borrow(|store| {
            store
                .get(&action_intent_key.to_str())
                .map(|versioned_action_intent| versioned_action_intent.into_action_intent())
        })
    }

    pub fn get_by_action_id(&self, action_id: String) -> Vec<ActionIntent> {
        VERSIONED_ACTION_INTENT_STORE.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id: action_id.clone(),
                intent_id: "".to_string(),
            };

            let prefix = key.to_str().clone();

            let action_intents = store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, versioned_action_intent)| versioned_action_intent.into_action_intent())
                .collect();

            return action_intents;
        })
    }

    pub fn get_by_intent_id(&self, intent_id: String) -> Vec<ActionIntent> {
        VERSIONED_ACTION_INTENT_STORE.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id: "".to_string(),
                intent_id: intent_id.clone(),
            };

            let prefix = key.to_str_reverse();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, versioned_action_intent)| versioned_action_intent.into_action_intent())
                .collect()
        })
    }

    pub fn update(&self, action_intent: ActionIntent) {
        VERSIONED_ACTION_INTENT_STORE.with_borrow_mut(|store| {
            let key = ActionIntentKey {
                action_id: action_intent.action_id.clone(),
                intent_id: action_intent.intent_id.clone(),
            };
            let versioned_action_intent =
                VersionedActionIntent::build(CURRENT_DATA_VERSION, action_intent)
                    .expect("Failed to create versioned action intent");
            store.insert(key.to_str(), versioned_action_intent);
        });
    }
}
