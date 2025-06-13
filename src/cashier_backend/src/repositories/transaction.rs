// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use super::VERSIONED_TRANSACTION_STORE;
use cashier_types::{versioned::VersionedTransaction, Transaction, TransactionKey};

const CURRENT_DATA_VERSION: u32 = 1;

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
        VERSIONED_TRANSACTION_STORE.with_borrow_mut(|store| {
            let versioned_transaction =
                VersionedTransaction::build(CURRENT_DATA_VERSION, transaction.clone())
                    .expect("Failed to create versioned transaction");
            store.insert(id, versioned_transaction);
        });

        transaction
    }

    pub fn update(&self, transaction: Transaction) -> Transaction {
        let id: TransactionKey = transaction.id.clone();
        VERSIONED_TRANSACTION_STORE.with_borrow_mut(|store| {
            let versioned_transaction =
                VersionedTransaction::build(CURRENT_DATA_VERSION, transaction.clone())
                    .expect("Failed to create versioned transaction");
            store.insert(id, versioned_transaction);
        });

        transaction
    }

    pub fn batch_create(&self, transactions: Vec<Transaction>) {
        VERSIONED_TRANSACTION_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                let versioned_transaction =
                    VersionedTransaction::build(CURRENT_DATA_VERSION, transaction)
                        .expect("Failed to create versioned transaction");
                store.insert(id, versioned_transaction);
            }
        });
    }

    pub fn batch_update(&self, transactions: Vec<Transaction>) {
        VERSIONED_TRANSACTION_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                let versioned_transaction =
                    VersionedTransaction::build(CURRENT_DATA_VERSION, transaction)
                        .expect("Failed to create versioned transaction");
                store.insert(id, versioned_transaction);
            }
        });
    }

    pub fn batch_get(&self, ids: Vec<TransactionKey>) -> Vec<Transaction> {
        VERSIONED_TRANSACTION_STORE.with_borrow(|store| {
            ids.into_iter()
                .filter_map(|id| store.get(&id))
                .map(|versioned_transaction| versioned_transaction.into_transaction())
                .collect()
        })
    }

    pub fn get(&self, id: &TransactionKey) -> Option<Transaction> {
        VERSIONED_TRANSACTION_STORE.with_borrow(|store| {
            store
                .get(id)
                .map(|versioned_transaction| versioned_transaction.into_transaction())
        })
    }

    pub fn delete(&self, id: &TransactionKey) {
        VERSIONED_TRANSACTION_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
