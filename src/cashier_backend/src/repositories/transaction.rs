use super::{base_repository::Store, TRANSACTION_STORE};
use cashier_types::{Transaction, TransactionKey};

pub struct TransactionRepository {}

impl TransactionRepository {
    pub fn create(&self, transaction: Transaction) -> Transaction {
        let id: TransactionKey = transaction.id.clone();
        TRANSACTION_STORE.with_borrow_mut(|store| {
            store.insert(id, transaction.clone());
        });

        transaction
    }

    pub fn update(&self, transaction: Transaction) -> Transaction {
        let id: TransactionKey = transaction.id.clone();
        TRANSACTION_STORE.with_borrow_mut(|store| {
            store.insert(id, transaction.clone());
        });

        transaction
    }

    pub fn batch_create(&self, transactions: Vec<Transaction>) {
        TRANSACTION_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                store.insert(id, transaction.clone());
            }
        });
    }

    pub fn batch_update(&self, transactions: Vec<Transaction>) {
        TRANSACTION_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                store.insert(id, transaction.clone());
            }
        });
    }

    pub fn batch_get(&self, ids: Vec<TransactionKey>) -> Vec<Transaction> {
        TRANSACTION_STORE.with_borrow(|store| store.batch_get(ids))
    }

    pub fn get(&self, id: &TransactionKey) -> Option<Transaction> {
        TRANSACTION_STORE.with_borrow(|store| store.get(id).clone())
    }
}

impl Default for TransactionRepository {
    fn default() -> Self {
        TransactionRepository {}
    }
}
