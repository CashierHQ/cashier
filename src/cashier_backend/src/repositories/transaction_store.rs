use super::{entities::transaction::Transaction, TRANSACTION_STORE};

pub fn create(transaction: Transaction) -> Transaction {
    let pk = transaction.pk.clone();
    TRANSACTION_STORE.with(|store| {
        store.borrow_mut().insert(pk, transaction.clone());
    });

    transaction
}
