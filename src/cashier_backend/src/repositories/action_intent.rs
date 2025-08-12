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

            store
                .range(prefix.clone()..)
                .filter(|entry| entry.key().starts_with(&prefix))
                .map(|entry| entry.value())
                .collect()
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
                .filter(|entry| entry.key().starts_with(&prefix))
                .map(|entry| entry.value())
                .collect()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_batch_create_action_intents() {
        let repo = ActionIntentRepository::new();
        let action_intents = vec![
            ActionIntent {
                action_id: "action1".to_string(),
                intent_id: "intent1".to_string(),
            },
            ActionIntent {
                action_id: "action2".to_string(),
                intent_id: "intent2".to_string(),
            },
        ];

        repo.batch_create(action_intents);

        let retrieved = repo.get_by_action_id("action1");
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().intent_id, "intent1");

        let retrieved = repo.get_by_intent_id("intent2");
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().action_id, "action2");
    }

    #[test]
    fn it_should_get_by_action_id() {
        let repo = ActionIntentRepository::new();
        let action_intent1 = ActionIntent {
            action_id: "action1".to_string(),
            intent_id: "intent1".to_string(),
        };
        let action_intent2 = ActionIntent {
            action_id: "action1".to_string(),
            intent_id: "intent2".to_string(),
        };
        repo.batch_create(vec![action_intent1, action_intent2]);

        let retrieved = repo.get_by_action_id("action1");
        assert_eq!(retrieved.len(), 2);
        assert_eq!(retrieved.first().unwrap().intent_id, "intent1");
        assert_eq!(retrieved.first().unwrap().action_id, "action1");
    }

    #[test]
    fn it_should_get_by_intent_id() {
        let repo = ActionIntentRepository::new();
        let action_intent1 = ActionIntent {
            action_id: "action1".to_string(),
            intent_id: "intent1".to_string(),
        };
        let action_intent2 = ActionIntent {
            action_id: "action2".to_string(),
            intent_id: "intent1".to_string(),
        };
        repo.batch_create(vec![action_intent1, action_intent2]);

        let retrieved = repo.get_by_intent_id("intent1");
        assert_eq!(retrieved.len(), 2);
        assert_eq!(retrieved.first().unwrap().action_id, "action1");
        assert_eq!(retrieved.first().unwrap().intent_id, "intent1");
    }

    #[test]
    fn it_should_create_action_intent_repository_by_default() {
        let repo = ActionIntentRepository::default();
        assert!(repo.get_by_action_id("nonexistent").is_empty());
        assert!(repo.get_by_intent_id("nonexistent").is_empty());
    }
}
