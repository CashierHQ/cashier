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

use cashier_types::{
    intent_transaction::v1::IntentTransaction, IntentTransactionKey, VersionedIntentTransaction,
};

use super::VERSIONED_INTENT_TRANSACTION_STORE;

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct IntentTransactionRepository {}

#[cfg_attr(test, faux::methods)]
impl IntentTransactionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, intent_transaction: IntentTransaction) -> IntentTransaction {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
            let key = IntentTransactionKey {
                intent_id: intent_transaction.intent_id.clone(),
                transaction_id: intent_transaction.transaction_id.clone(),
            };

            let versioned_intent_transaction =
                VersionedIntentTransaction::build(CURRENT_DATA_VERSION, intent_transaction.clone())
                    .expect("Failed to create versioned intent transaction");
            store.insert(key.to_str(), versioned_intent_transaction.clone());
            store.insert(key.to_str_reverse(), versioned_intent_transaction);
            intent_transaction
        })
    }

    pub fn batch_create(&self, intent_transactions: Vec<IntentTransaction>) {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
            for intent_transaction in intent_transactions {
                let key = IntentTransactionKey {
                    intent_id: intent_transaction.intent_id.clone(),
                    transaction_id: intent_transaction.transaction_id.clone(),
                };

                let versioned_intent_transaction = VersionedIntentTransaction::build(
                    CURRENT_DATA_VERSION,
                    intent_transaction.clone(),
                )
                .expect("Failed to create versioned intent transaction");
                store.insert(key.to_str(), versioned_intent_transaction.clone());
                store.insert(key.to_str_reverse(), versioned_intent_transaction);
            }
        });
    }

    pub fn get(&self, intent_id: String, transaction_id: String) -> Option<IntentTransaction> {
        let id = IntentTransactionKey {
            intent_id: intent_id.clone(),
            transaction_id: transaction_id.clone(),
        };
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow(|store| {
            store
                .get(&id.to_str())
                .map(|versioned_data| versioned_data.into_intent_transaction())
        })
    }

    pub fn get_by_intent_id(&self, intent_id: String) -> Vec<IntentTransaction> {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id: intent_id.clone(),
                transaction_id: "".to_string(),
            };

            let prefix = key.to_str();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.into_intent_transaction())
                .collect()
        })
    }

    pub fn get_by_transaction_id(&self, transaction_id: String) -> Vec<IntentTransaction> {
        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow(|store| {
            let key = IntentTransactionKey {
                intent_id: "".to_string(),
                transaction_id: transaction_id.clone(),
            };

            let prefix = key.to_str_reverse();

            store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.into_intent_transaction())
                .collect()
        })
    }
}
