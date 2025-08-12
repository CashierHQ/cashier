// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{action_intent::v1::ActionIntent, keys::ActionIntentKey};

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
    use crate::utils::test_utils::random_id_string;

    #[test]
    fn it_should_batch_create_action_intents() {
        let repo = ActionIntentRepository::new();
        let action_id1 = random_id_string(10);
        let intent_id1 = random_id_string(10);
        let action_id2 = random_id_string(10);
        let intent_id2 = random_id_string(10);
        let action_intents = vec![
            ActionIntent {
                action_id: action_id1.clone(),
                intent_id: intent_id1.clone(),
            },
            ActionIntent {
                action_id: action_id2.clone(),
                intent_id: intent_id2.clone(),
            },
        ];

        repo.batch_create(action_intents);

        let retrieved = repo.get_by_action_id(&action_id1);
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().intent_id, intent_id1);

        let retrieved = repo.get_by_intent_id(&intent_id2);
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().action_id, action_id2);
    }

    #[test]
    fn it_should_get_by_action_id() {
        let repo = ActionIntentRepository::new();
        let action_id1 = random_id_string(10);
        let action_id2 = random_id_string(10);
        let intent_id1 = random_id_string(10);
        let intent_id2 = random_id_string(10);
        let action_intent1 = ActionIntent {
            action_id: action_id1.clone(),
            intent_id: intent_id1.clone(),
        };
        let action_intent2 = ActionIntent {
            action_id: action_id2,
            intent_id: intent_id2,
        };
        repo.batch_create(vec![action_intent1, action_intent2]);

        let retrieved = repo.get_by_action_id(&action_id1);
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().intent_id, intent_id1);
        assert_eq!(retrieved.first().unwrap().action_id, action_id1);
    }

    #[test]
    fn it_should_get_by_intent_id() {
        let repo = ActionIntentRepository::new();
        let action_id1 = random_id_string(10);
        let intent_id1 = random_id_string(10);
        let action_id2 = random_id_string(10);
        let intent_id2 = random_id_string(10);
        let action_intent1 = ActionIntent {
            action_id: action_id1.clone(),
            intent_id: intent_id1.clone(),
        };
        let action_intent2 = ActionIntent {
            action_id: action_id2,
            intent_id: intent_id2,
        };
        repo.batch_create(vec![action_intent1, action_intent2]);

        let retrieved = repo.get_by_intent_id(&intent_id1);
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().action_id, action_id1);
        assert_eq!(retrieved.first().unwrap().intent_id, intent_id1);
    }

    #[test]
    fn it_should_create_action_intent_repository_by_default() {
        let repo = ActionIntentRepository::default();
        assert!(repo.get_by_action_id("nonexistent").is_empty());
        assert!(repo.get_by_intent_id("nonexistent").is_empty());
    }
}
