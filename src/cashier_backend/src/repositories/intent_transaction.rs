// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use cashier_types::{
    intent_transaction::v1::IntentTransaction, IntentTransactionKey, VersionedIntentTransaction,
};

use super::VERSIONED_INTENT_TRANSACTION_STORE;

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct IntentTransactionRepository {}

#[cfg_attr(test, faux::methods)]
impl IntentTransactionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, intent_transaction: IntentTransaction) -> IntentTransaction {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
            let key = IntentTransactionKey {
                intent_id: intent_transaction.intent_id.clone(),
                transaction_id: intent_transaction.transaction_id.clone(),
            };

            let versioned_intent_transaction =
                VersionedIntentTransaction::build(CURRENT_DATA_VERSION, intent_transaction.clone())
                    .expect("Failed to create versioned intent transaction");
            store.insert(key.to_str(), versioned_intent_transaction.clone());
            store.insert(key.to_str_reverse(), versioned_intent_transaction);
            intent_transaction
        })
    }

    pub fn batch_create(&self, intent_transactions: Vec<IntentTransaction>) {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
            for intent_transaction in intent_transactions {
                let key = IntentTransactionKey {
                    intent_id: intent_transaction.intent_id.clone(),
                    transaction_id: intent_transaction.transaction_id.clone(),
                };

                let versioned_intent_transaction = VersionedIntentTransaction::build(
                    CURRENT_DATA_VERSION,
                    intent_transaction.clone(),
                )
                .expect("Failed to create versioned intent transaction");
                store.insert(key.to_str(), versioned_intent_transaction.clone());
                store.insert(key.to_str_reverse(), versioned_intent_transaction);
            }
        });
    }

    pub fn get(&self, intent_id: String, transaction_id: String) -> Option<IntentTransaction> {
        let id = IntentTransactionKey {
            intent_id: intent_id.clone(),
            transaction_id: transaction_id.clone(),
        };
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow(|store| {
            store
                .get(&id.to_str())
                .map(|versioned_data| versioned_data.into_intent_transaction())
        })
    }

    pub fn get_by_intent_id(&self, intent_id: String) -> Vec<IntentTransaction> {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id: intent_id.clone(),
                transaction_id: "".to_string(),
            };

            let prefix = key.to_str();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.into_intent_transaction())
                .collect()
        })
    }

    pub fn get_by_transaction_id(&self, transaction_id: String) -> Vec<IntentTransaction> {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id: "".to_string(),
                transaction_id: transaction_id.clone(),
            };

            let prefix = key.to_str_reverse();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.into_intent_transaction())
                .collect()
        })
    }
}
