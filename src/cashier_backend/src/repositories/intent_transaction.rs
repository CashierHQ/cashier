// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::intent_transaction::v1::IntentTransaction;
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};

pub type IntentTransactionRepositoryStorage =
    StableBTreeMap<String, IntentTransaction, VirtualMemory<DefaultMemoryImpl>>;

struct IntentTransactionKey<'a> {
    pub intent_id: &'a str,
    pub transaction_id: &'a str,
}

impl<'a> IntentTransactionKey<'a> {
    pub fn to_str(&self) -> String {
        format!(
            "INTENT#{}#TRANSACTION#{}",
            self.intent_id, self.transaction_id
        )
    }

    pub fn to_str_reverse(&self) -> String {
        format!(
            "TRANSACTION#{}#INTENT#{}",
            self.transaction_id, self.intent_id
        )
    }
}

#[derive(Clone)]
pub struct IntentTransactionRepository<S: Storage<IntentTransactionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<IntentTransactionRepositoryStorage>> IntentTransactionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn batch_create(&mut self, intent_transactions: Vec<IntentTransaction>) {
        self.storage.with_borrow_mut(|store| {
            for intent_transaction in intent_transactions {
                let key = IntentTransactionKey {
                    intent_id: &intent_transaction.intent_id,
                    transaction_id: &intent_transaction.transaction_id,
                };

                store.insert(key.to_str(), intent_transaction.clone());
                store.insert(key.to_str_reverse(), intent_transaction);
            }
        });
    }

    pub fn get_by_intent_id(&self, intent_id: &str) -> Vec<IntentTransaction> {
        self.storage.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id,
                transaction_id: "",
            };

            let prefix = key.to_str();

            store
                .range(prefix.clone()..)
                .filter(|entry| entry.key().starts_with(&prefix))
                .map(|entry| entry.value())
                .collect()
        })
    }

    pub fn get_by_transaction_id(&self, transaction_id: &str) -> Vec<IntentTransaction> {
        self.storage.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id: "",
                transaction_id,
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
    fn it_should_batch_create_intent_actions() {
        // Arrange
        let mut repo = TestRepositories::new().intent_transaction();
        let intent_id1 = random_id_string();
        let transaction_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let transaction_id2 = random_id_string();
        let intent_transactions = vec![
            IntentTransaction {
                intent_id: intent_id1.clone(),
                transaction_id: transaction_id1.clone(),
            },
            IntentTransaction {
                intent_id: intent_id2.clone(),
                transaction_id: transaction_id2.clone(),
            },
        ];

        // Act
        repo.batch_create(intent_transactions);

        // Assert
        let transactions = repo.get_by_intent_id(&intent_id1);
        assert_eq!(transactions.len(), 1);
        assert_eq!(
            transactions.first().unwrap().transaction_id,
            transaction_id1
        );

        let transactions = repo.get_by_transaction_id(&transaction_id2);
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions.first().unwrap().intent_id, intent_id2);
    }

    #[test]
    fn it_should_get_intent_action_by_intent_id() {
        // Arrange
        let mut repo = TestRepositories::new().intent_transaction();
        let intent_id1 = random_id_string();
        let transaction_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let transaction_id2 = random_id_string();
        let intent_transaction1 = IntentTransaction {
            intent_id: intent_id1.clone(),
            transaction_id: transaction_id1.clone(),
        };
        let intent_transaction2 = IntentTransaction {
            intent_id: intent_id2,
            transaction_id: transaction_id2,
        };
        repo.batch_create(vec![intent_transaction1, intent_transaction2]);

        // Act
        let transactions = repo.get_by_intent_id(&intent_id1);

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(
            transactions.first().unwrap().transaction_id,
            transaction_id1
        );
    }

    #[test]
    fn it_should_get_intent_action_by_transaction_id() {
        // Arrange
        let mut repo = TestRepositories::new().intent_transaction();
        let intent_id1 = random_id_string();
        let transaction_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let transaction_id2 = random_id_string();
        let intent_transaction1 = IntentTransaction {
            intent_id: intent_id1.clone(),
            transaction_id: transaction_id1.clone(),
        };
        let intent_transaction2 = IntentTransaction {
            intent_id: intent_id2,
            transaction_id: transaction_id2,
        };
        repo.batch_create(vec![intent_transaction1, intent_transaction2]);

        // Act
        let transactions = repo.get_by_transaction_id(&transaction_id1);

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions.first().unwrap().intent_id, intent_id1);
    }
}
