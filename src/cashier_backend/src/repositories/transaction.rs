// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::TRANSACTION_STORE;

use cashier_types::{keys::TransactionKey, transaction::v2::Transaction};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct TransactionRepository {}

#[cfg_attr(test, faux::methods)]
impl TransactionRepository {
    pub fn new() -> Self {
        Self {}
    }

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
                store.insert(id, transaction);
            }
        });
    }

    pub fn batch_update(&self, transactions: Vec<Transaction>) {
        TRANSACTION_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                store.insert(id, transaction);
            }
        });
    }

    pub fn batch_get(&self, ids: Vec<TransactionKey>) -> Vec<Transaction> {
        TRANSACTION_STORE
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn get(&self, id: &TransactionKey) -> Option<Transaction> {
        TRANSACTION_STORE.with_borrow(|store| store.get(id))
    }

    pub fn delete(&self, id: &TransactionKey) {
        TRANSACTION_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
