// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::{
    intent_transaction::v1::IntentTransaction, keys::IntentTransactionKey,
};

use super::INTENT_TRANSACTION_STORE;

#[derive(Clone)]

pub struct IntentTransactionRepository {}

impl Default for IntentTransactionRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl IntentTransactionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn batch_create(&self, intent_transactions: Vec<IntentTransaction>) {
        INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
            for intent_transaction in intent_transactions {
                let key = IntentTransactionKey {
                    intent_id: intent_transaction.intent_id.clone(),
                    transaction_id: intent_transaction.transaction_id.clone(),
                };

                store.insert(key.to_str(), intent_transaction.clone());
                store.insert(key.to_str_reverse(), intent_transaction);
            }
        });
    }

    pub fn get_by_intent_id(&self, intent_id: &str) -> Vec<IntentTransaction> {
        INTENT_TRANSACTION_STORE.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id: intent_id.to_string(),
                transaction_id: "".to_string(),
            };

            let prefix = key.to_str();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value)
                .collect()
        })
    }

    pub fn get_by_transaction_id(&self, transaction_id: &str) -> Vec<IntentTransaction> {
        INTENT_TRANSACTION_STORE.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id: "".to_string(),
                transaction_id: transaction_id.to_string(),
            };

            let prefix = key.to_str_reverse();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value)
                .collect()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn batch_create() {
        let repo = IntentTransactionRepository::new();
        let intent_transactions = vec![
            IntentTransaction {
                intent_id: "intent1".to_string(),
                transaction_id: "transaction1".to_string(),
            },
            IntentTransaction {
                intent_id: "intent2".to_string(),
                transaction_id: "transaction2".to_string(),
            },
        ];
        repo.batch_create(intent_transactions);

        let transactions = repo.get_by_intent_id("intent1");
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].transaction_id, "transaction1");

        let transactions = repo.get_by_transaction_id("transaction2");
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].intent_id, "intent2");
    }

    #[test]
    fn get_by_intent_id() {
        let repo = IntentTransactionRepository::new();
        let intent_transaction = IntentTransaction {
            intent_id: "intent1".to_string(),
            transaction_id: "transaction1".to_string(),
        };
        repo.batch_create(vec![intent_transaction.clone()]);

        let transactions = repo.get_by_intent_id("intent1");
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].transaction_id, "transaction1");
    }

    #[test]
    fn get_by_transaction_id() {
        let repo = IntentTransactionRepository::new();
        let intent_transaction = IntentTransaction {
            intent_id: "intent1".to_string(),
            transaction_id: "transaction1".to_string(),
        };
        repo.batch_create(vec![intent_transaction.clone()]);

        let transactions = repo.get_by_transaction_id("transaction1");
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].intent_id, "intent1");
    }

    #[test]
    fn default(){
        let repo = IntentTransactionRepository::default();
        assert!(repo.get_by_intent_id("nonexistent").is_empty());
        assert!(repo.get_by_transaction_id("nonexistent").is_empty());
    }

}
