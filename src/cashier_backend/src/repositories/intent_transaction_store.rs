use super::{entities::intent_transaction::IntentTransaction, INTENT_TRANSACTION_STORE};

pub fn create(intent_transaction: IntentTransaction) -> IntentTransaction {
    INTENT_TRANSACTION_STORE.with(|store| {
        let pk = intent_transaction.pk.clone();
        store.borrow_mut().insert(pk, intent_transaction.clone());
    });

    intent_transaction
}

pub fn batch_create(intent_transactions: Vec<IntentTransaction>) {
    INTENT_TRANSACTION_STORE.with(|store| {
        for intent_transaction in intent_transactions {
            let pk = intent_transaction.pk.clone();
            store.borrow_mut().insert(pk, intent_transaction.clone());
        }
    });
}

pub fn get(pk: &str) -> Option<IntentTransaction> {
    INTENT_TRANSACTION_STORE.with(|store| store.borrow().get(&pk.to_string()))
}
