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

use super::{base_repository::Store, TRANSACTION_STORE};
use cashier_types::{Transaction, TransactionKey};

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

    pub fn delete(&self, id: &TransactionKey) {
        TRANSACTION_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
