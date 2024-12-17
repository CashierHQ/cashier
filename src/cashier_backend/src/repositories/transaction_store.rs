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

pub fn batch_get(ids: Vec<String>) -> Vec<crate::types::transaction::Transaction> {
    TRANSACTION_STORE.with(|store| {
        let store = store.borrow();
        let mut result = Vec::new();

        for id in ids {
            let transaction = store.get(&Transaction::build_pk(id));
            match transaction {
                Some(transaction) => {
                    result.push(crate::types::transaction::Transaction::from_persistence(
                        transaction,
                    ));
                }
                None => {
                    continue;
                }
            }
        }

        result
    })
}
