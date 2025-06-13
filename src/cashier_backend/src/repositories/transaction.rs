// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use crate::repositories::VERSIONED_TRANSACTION_V2_STORE;

use cashier_types::{transaction::v2::Transaction, TransactionKey, VersionedTransaction};

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
        VERSIONED_TRANSACTION_V2_STORE.with_borrow_mut(|store| {
            let versioned_transaction = VersionedTransaction::build_v2(transaction.clone())
                .expect("Failed to create versioned transaction");
            store.insert(id, versioned_transaction);
        });

        transaction
    }

    pub fn update(&self, transaction: Transaction) -> Transaction {
        let id: TransactionKey = transaction.id.clone();
        VERSIONED_TRANSACTION_V2_STORE.with_borrow_mut(|store| {
            let versioned_transaction = VersionedTransaction::build_v2(transaction.clone())
                .expect("Failed to create versioned transaction");
            store.insert(id, versioned_transaction);
        });

        transaction
    }

    pub fn batch_create(&self, transactions: Vec<Transaction>) {
        VERSIONED_TRANSACTION_V2_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                let versioned_transaction = VersionedTransaction::build_v2(transaction)
                    .expect("Failed to create versioned transaction");
                store.insert(id, versioned_transaction);
            }
        });
    }

    pub fn batch_update(&self, transactions: Vec<Transaction>) {
        VERSIONED_TRANSACTION_V2_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                let versioned_transaction = VersionedTransaction::build_v2(transaction)
                    .expect("Failed to create versioned transaction");
                store.insert(id, versioned_transaction);
            }
        });
    }

    pub fn batch_get(&self, ids: Vec<TransactionKey>) -> Vec<Transaction> {
        VERSIONED_TRANSACTION_V2_STORE.with_borrow(|store| {
            ids.into_iter()
                .filter_map(|id| store.get(&id))
                .map(|versioned_transaction| versioned_transaction.to_v2())
                .collect()
        })
    }

    pub fn get(&self, id: &TransactionKey) -> Option<Transaction> {
        VERSIONED_TRANSACTION_V2_STORE.with_borrow(|store| {
            store
                .get(id)
                .map(|versioned_transaction| versioned_transaction.to_v2())
        })
    }

    pub fn delete(&self, id: &TransactionKey) {
        VERSIONED_TRANSACTION_V2_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
