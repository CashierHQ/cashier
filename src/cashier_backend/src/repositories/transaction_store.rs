use super::{entities::transaction::Transaction, TRANSACTION_STORE};

pub fn create(transaction: Transaction) -> Transaction {
    let pk = transaction.pk.clone();
    TRANSACTION_STORE.with(|store| {
        store.borrow_mut().insert(pk, transaction.clone());
    });

    transaction
}

pub fn batch_create(transactions: Vec<Transaction>) {
    TRANSACTION_STORE.with(|store| {
        for transaction in transactions {
            let pk = transaction.pk.clone();
            store.borrow_mut().insert(pk, transaction.clone());
        }
    });
}
