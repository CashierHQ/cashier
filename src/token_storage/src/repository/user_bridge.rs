// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_structures::{DefaultMemoryImpl, VirtualMemory};
use ic_mple_utils::store::Storage;
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::bitcoin::bridge::{BridgeTransaction, BridgeTransactionCodec};

// Store for UserBridgeRepository
pub type UserBridgeTransactionRepositoryStorage = VersionedBTreeMap<
    Principal,
    Vec<BridgeTransaction>,
    BridgeTransactionCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalUserBridgeRepositoryStorage =
    &'static LocalKey<RefCell<UserBridgeTransactionRepositoryStorage>>;

pub struct UserBridgeTransactionRepository<S: Storage<UserBridgeTransactionRepositoryStorage>> {
    address_store: S,
}

impl<S: Storage<UserBridgeTransactionRepositoryStorage>> UserBridgeTransactionRepository<S> {
    /// Create a new UserBridgeTransactionRepository
    pub fn new(storage: S) -> Self {
        Self {
            address_store: storage,
        }
    }

    /// Get bridge transactions by user_id with pagination
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// * `start` - The starting index
    /// * `limit` - The maximum number of transactions to return
    /// # Returns
    /// * `Vec<BridgeTransaction>` - List of BridgeTransactions
    pub fn get_bridge_transactions(
        &self,
        user_id: &Principal,
        start: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<BridgeTransaction> {
        self.address_store.with_borrow(|store| {
            let transactions = store.get(user_id).unwrap_or_else(|| vec![]);
            let start = start.unwrap_or(0) as usize;
            let limit = limit.unwrap_or(transactions.len() as u32) as usize;

            transactions
                .iter()
                .skip(start)
                .take(limit)
                .cloned()
                .collect()
        })
    }

    /// Upsert a bridge transaction for a user
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// * `bridge_id` - The bridge transaction ID
    /// * `updated_transaction` - The updated BridgeTransaction
    /// # Returns
    /// * `Result<(), String>` - Ok if successful, Err with message if failed
    pub fn upsert_bridge_transaction(
        &mut self,
        user_id: Principal,
        bridge_id: String,
        updated_transaction: BridgeTransaction,
    ) -> Result<(), String> {
        self.address_store.with_borrow_mut(|store| {
            let mut transactions = store
                .get(&user_id)
                .ok_or_else(|| "No transactions found for user".to_string())?;

            if let Some(pos) = transactions.iter().position(|tx| tx.bridge_id == bridge_id) {
                transactions[pos] = updated_transaction;
                store.insert(user_id, transactions);
                Ok(())
            } else {
                transactions.push(updated_transaction);
                store.insert(user_id, transactions);
                Ok(())
            }
        })
    }
}
