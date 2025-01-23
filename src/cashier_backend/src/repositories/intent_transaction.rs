use cashier_types::IntentTransaction;

use super::{base_repository::Store, INTENT_TRANSACTION_STORE};

pub fn create(intent_transaction: IntentTransaction) -> IntentTransaction {
    INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
        let key = (
            intent_transaction.intent_id.clone(),
            intent_transaction.transaction_id.clone(),
        );
        store.insert(key, intent_transaction.clone());
        intent_transaction
    })
}

pub fn batch_create(intent_transactions: Vec<IntentTransaction>) {
    INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
        let key_values: Vec<(cashier_types::IntentTransactionKey, IntentTransaction)> =
            intent_transactions
                .into_iter()
                .map(|intent_transaction| {
                    (
                        (
                            intent_transaction.intent_id.clone(),
                            intent_transaction.transaction_id.clone(),
                        ),
                        intent_transaction,
                    )
                })
                .collect();

        store.batch_create(key_values);
    });
}

pub fn get(intent_id: String, transaction_id: String) -> Option<IntentTransaction> {
    let id = (intent_id, transaction_id);
    INTENT_TRANSACTION_STORE.with_borrow(|store| store.get(&id).clone())
}
