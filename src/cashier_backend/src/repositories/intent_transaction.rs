use cashier_types::{IntentTransaction, IntentTransactionKey};

use super::{base_repository::Store, INTENT_TRANSACTION_STORE};

pub fn create(intent_transaction: IntentTransaction) -> IntentTransaction {
    INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
        let key = IntentTransactionKey {
            intent_id: intent_transaction.intent_id.clone(),
            transaction_id: intent_transaction.transaction_id.clone(),
        };

        store.insert(key.to_str(), intent_transaction.clone());
        store.insert(key.to_str_reverse(), intent_transaction.clone());
        intent_transaction
    })
}

pub fn batch_create(intent_transactions: Vec<IntentTransaction>) {
    INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
        for intent_transaction in intent_transactions {
            let key = IntentTransactionKey {
                intent_id: intent_transaction.intent_id.clone(),
                transaction_id: intent_transaction.transaction_id.clone(),
            };

            store.insert(key.to_str(), intent_transaction.clone());
            store.insert(key.to_str_reverse(), intent_transaction.clone());
        }
    });
}

pub fn get(intent_id: String, transaction_id: String) -> Option<IntentTransaction> {
    let id = IntentTransactionKey {
        intent_id: intent_id.clone(),
        transaction_id: transaction_id.clone(),
    };
    INTENT_TRANSACTION_STORE.with_borrow(|store| store.get(&id.to_str()).clone())
}

pub fn get_by_intent_id(intent_id: String) -> Vec<IntentTransaction> {
    INTENT_TRANSACTION_STORE.with_borrow(|store| {
        let key = IntentTransactionKey {
            intent_id: intent_id.clone(),
            transaction_id: "".to_string(),
        };

        let prefix = key.to_str();

        store
            .range(prefix.clone()..)
            .filter(|(key, _)| key.starts_with(&prefix))
            .map(|(_, value)| value.clone())
            .collect()
    })
}

pub fn get_by_transaction_id(transaction_id: String) -> Vec<IntentTransaction> {
    INTENT_TRANSACTION_STORE.with_borrow(|store| {
        let key = IntentTransactionKey {
            intent_id: "".to_string(),
            transaction_id: transaction_id.clone(),
        };

        let prefix = key.to_str_reverse();

        store
            .range(prefix.clone()..)
            .filter(|(key, _)| key.starts_with(&prefix))
            .map(|(_, value)| value.clone())
            .collect()
    })
}
