use super::{base_repository::Store, TRANSACTION_STORE};
use cashier_types::{Transaction, TransactionKey};

pub fn create(transaction: Transaction) -> Transaction {
    let id: TransactionKey = transaction.id.clone();
    TRANSACTION_STORE.with_borrow_mut(|store| {
        store.insert(id, transaction.clone());
    });

    transaction
}

pub fn update(transaction: Transaction) -> Transaction {
    let id: TransactionKey = transaction.id.clone();
    TRANSACTION_STORE.with_borrow_mut(|store| {
        store.insert(id, transaction.clone());
    });

    transaction
}

pub fn batch_create(transactions: Vec<Transaction>) {
    TRANSACTION_STORE.with_borrow_mut(|store| {
        for transaction in transactions {
            let id: TransactionKey = transaction.id.clone();
            store.insert(id, transaction.clone());
        }
    });
}

pub fn batch_update(transactions: Vec<Transaction>) {
    TRANSACTION_STORE.with_borrow_mut(|store| {
        for transaction in transactions {
            let id: TransactionKey = transaction.id.clone();
            store.insert(id, transaction.clone());
        }
    });
}

pub fn batch_get(ids: Vec<TransactionKey>) -> Vec<Transaction> {
    TRANSACTION_STORE.with_borrow(|store| store.batch_get(ids))
}

pub fn get(id: &TransactionKey) -> Option<Transaction> {
    TRANSACTION_STORE.with_borrow(|store| store.get(id).clone())
}
