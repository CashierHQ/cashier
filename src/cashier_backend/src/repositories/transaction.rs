// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::TRANSACTION_STORE;

use cashier_types::repository::{keys::TransactionKey, transaction::v2::Transaction};

#[derive(Clone)]
pub struct TransactionRepository {}

impl Default for TransactionRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl TransactionRepository {
    pub fn new() -> Self {
        Self {}
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

    pub fn batch_get(&self, ids: Vec<TransactionKey>) -> Vec<Transaction> {
        TRANSACTION_STORE
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn get(&self, id: &TransactionKey) -> Option<Transaction> {
        TRANSACTION_STORE.with_borrow(|store| store.get(id))
    }
}
