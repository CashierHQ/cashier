// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::action_intent::v1::ActionIntent;
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};

pub type ActionIntentRepositoryStorage =
    StableBTreeMap<String, ActionIntent, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct ActionIntentRepository<S: Storage<ActionIntentRepositoryStorage>> {
    storage: S,
}

#[derive(Debug, Clone)]
struct ActionIntentKey<'a> {
    pub action_id: &'a str,
    pub intent_id: &'a str,
}

impl ActionIntentKey<'_> {
    pub fn to_str(&self) -> String {
        format!("ACTION#{}#INTENT#{}", self.action_id, self.intent_id)
    }

    pub fn to_str_reverse(&self) -> String {
        format!("INTENT#{}#ACTION#{}", self.intent_id, self.action_id)
    }
}

impl<S: Storage<ActionIntentRepositoryStorage>> ActionIntentRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn batch_create(&mut self, action_intents: Vec<ActionIntent>) {
        self.storage.with_borrow_mut(|store| {
            for action_intent in action_intents {
                let key: ActionIntentKey = ActionIntentKey {
                    action_id: &action_intent.action_id,
                    intent_id: &action_intent.intent_id,
                };

                store.insert(key.to_str(), action_intent.clone());
                store.insert(key.to_str_reverse(), action_intent);
            }
        });
    }

    pub fn get_by_action_id(&self, action_id: &str) -> Vec<ActionIntent> {
        self.storage.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id,
                intent_id: "",
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
        self.storage.with_borrow(|store| {
            let key = ActionIntentKey {
                action_id: "",
                intent_id,
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
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::random_id_string,
    };

    #[test]
    fn it_should_batch_create_action_intents() {
        // Arrange
        let mut repo = TestRepositories::new().action_intent();
        let action_id1 = random_id_string();
        let intent_id1 = random_id_string();
        let action_id2 = random_id_string();
        let intent_id2 = random_id_string();
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

        // Act
        repo.batch_create(action_intents);

        // Assert
        let retrieved = repo.get_by_action_id(&action_id1);
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().intent_id, intent_id1);

        let retrieved = repo.get_by_intent_id(&intent_id2);
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().action_id, action_id2);
    }

    #[test]
    fn it_should_get_by_action_id() {
        // Arrange
        let mut repo = TestRepositories::new().action_intent();
        let action_id1 = random_id_string();
        let action_id2 = random_id_string();
        let intent_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let action_intent1 = ActionIntent {
            action_id: action_id1.clone(),
            intent_id: intent_id1.clone(),
        };
        let action_intent2 = ActionIntent {
            action_id: action_id2,
            intent_id: intent_id2,
        };
        repo.batch_create(vec![action_intent1, action_intent2]);

        // Act
        let retrieved = repo.get_by_action_id(&action_id1);

        // Assert
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().intent_id, intent_id1);
        assert_eq!(retrieved.first().unwrap().action_id, action_id1);
    }

    #[test]
    fn it_should_get_by_intent_id() {
        // Arrange
        let mut repo = TestRepositories::new().action_intent();
        let action_id1 = random_id_string();
        let intent_id1 = random_id_string();
        let action_id2 = random_id_string();
        let intent_id2 = random_id_string();
        let action_intent1 = ActionIntent {
            action_id: action_id1.clone(),
            intent_id: intent_id1.clone(),
        };
        let action_intent2 = ActionIntent {
            action_id: action_id2,
            intent_id: intent_id2,
        };
        repo.batch_create(vec![action_intent1, action_intent2]);

        // Act
        let retrieved = repo.get_by_intent_id(&intent_id1);

        // Assert
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved.first().unwrap().action_id, action_id1);
        assert_eq!(retrieved.first().unwrap().intent_id, intent_id1);
    }
}
