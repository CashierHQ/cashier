// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_structures::{DefaultMemoryImpl, VirtualMemory};
use ic_mple_utils::store::Storage;
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::bitcoin::bridge_transaction::{BridgeTransaction, BridgeTransactionCodec};

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
    bridge_transaction_store: S,
}

impl<S: Storage<UserBridgeTransactionRepositoryStorage>> UserBridgeTransactionRepository<S> {
    /// Create a new UserBridgeTransactionRepository
    pub fn new(storage: S) -> Self {
        Self {
            bridge_transaction_store: storage,
        }
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
        self.bridge_transaction_store.with_borrow_mut(|store| {
            let mut transactions = store.get(&user_id).unwrap_or_default();

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

    /// Get a bridge transaction by user_id and bridge_id
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// * `bridge_id` - The bridge transaction ID
    /// # Returns
    /// * `Option<BridgeTransaction>` - Some(BridgeTransaction) if found, None if not found
    pub fn get_bridge_transaction_by_id(
        &self,
        user_id: &Principal,
        bridge_id: &String,
    ) -> Option<BridgeTransaction> {
        self.bridge_transaction_store.with_borrow(|store| {
            let transactions = store.get(user_id).unwrap_or_else(|| vec![]);
            transactions
                .into_iter()
                .find(|tx| &tx.bridge_id == bridge_id)
        })
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
        self.bridge_transaction_store.with_borrow(|store| {
            let mut transactions = store.get(user_id).unwrap_or_default();
            // reverse the transactions array
            transactions.reverse();

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
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};
    use candid::Nat;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, BridgeTransaction, BridgeTransactionStatus, BridgeType,
    };

    #[test]
    fn it_should_insert_bridge_transactions() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let asset_infos = vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::BTC,
            asset_id: "btc".to_string(),
            ledger_id: random_principal_id(),
            amount: Nat::from(1000u64),
            decimals: 8,
        }];
        let bridge_tx_1 = BridgeTransaction {
            bridge_id: "bridge1".to_string(),
            icp_address: random_principal_id(),
            btc_address: "btc1".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: asset_infos.clone(),
            btc_txid: Some("txid1".to_string()),
            block_id: Some(Nat::from(1u64)),
            number_confirmations: 1,
            minted_block: None,
            minted_block_timestamp: None,
            minter_fee: None,
            btc_fee: None,
            status: BridgeTransactionStatus::Created,
        };

        // Act
        repo.upsert_bridge_transaction(user_id, bridge_tx_1.bridge_id.clone(), bridge_tx_1.clone())
            .unwrap();

        // Assert
        let transactions = repo.get_bridge_transactions(&user_id, None, None);
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0], bridge_tx_1);
    }

    #[test]
    fn it_should_update_bridge_transactions() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let asset_infos = vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::BTC,
            asset_id: "btc".to_string(),
            ledger_id: random_principal_id(),
            amount: Nat::from(1000u64),
            decimals: 8,
        }];
        let mut bridge_tx = BridgeTransaction {
            bridge_id: "bridge1".to_string(),
            icp_address: random_principal_id(),
            btc_address: "btc1".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: asset_infos.clone(),
            btc_txid: Some("txid1".to_string()),
            block_id: Some(Nat::from(1u64)),
            number_confirmations: 1,
            minted_block: None,
            minted_block_timestamp: None,
            minter_fee: None,
            btc_fee: None,
            status: BridgeTransactionStatus::Created,
        };

        // Act: Insert initial transaction
        repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
            .unwrap();

        // Act: Update transaction status
        bridge_tx.status = BridgeTransactionStatus::Completed;
        repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
            .unwrap();

        // Assert
        let transactions = repo.get_bridge_transactions(&user_id, None, None);
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0], bridge_tx);
        assert_eq!(transactions[0].status, BridgeTransactionStatus::Completed);
    }

    #[test]
    fn it_should_get_bridge_transactions_with_pagination() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let asset_infos = vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::BTC,
            asset_id: "btc".to_string(),
            ledger_id: random_principal_id(),
            amount: Nat::from(1000u64),
            decimals: 8,
        }];
        for i in 0..5 {
            let bridge_tx = BridgeTransaction {
                bridge_id: format!("bridge{}", i),
                icp_address: random_principal_id(),
                btc_address: format!("btc{}", i),
                bridge_type: BridgeType::Import,
                asset_infos: asset_infos.clone(),
                btc_txid: Some(format!("txid{}", i)),
                block_id: Some(Nat::from(i as u64 + 1)),
                number_confirmations: 1,
                minted_block: None,
                minted_block_timestamp: None,
                minter_fee: None,
                btc_fee: None,
                status: BridgeTransactionStatus::Created,
            };
            repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
                .unwrap();
        }

        // Act: Get first 2 transactions
        let transactions_page_1 = repo.get_bridge_transactions(&user_id, Some(0), Some(2));

        // Act: Get next 2 transactions
        let transactions_page_2 = repo.get_bridge_transactions(&user_id, Some(2), Some(2));

        // Assert
        assert_eq!(transactions_page_1.len(), 2);
        assert_eq!(transactions_page_1[0].bridge_id, "bridge4");
        assert_eq!(transactions_page_1[1].bridge_id, "bridge3");
        assert_eq!(transactions_page_2.len(), 2);
        assert_eq!(transactions_page_2[0].bridge_id, "bridge2");
        assert_eq!(transactions_page_2[1].bridge_id, "bridge1");
    }

    #[test]
    fn it_should_get_bridge_transaction_by_id() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let asset_infos = vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::BTC,
            asset_id: "btc".to_string(),
            ledger_id: random_principal_id(),
            amount: Nat::from(1000u64),
            decimals: 8,
        }];
        let bridge_tx = BridgeTransaction {
            bridge_id: "bridge1".to_string(),
            icp_address: random_principal_id(),
            btc_address: "btc1".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: asset_infos.clone(),
            btc_txid: Some("txid1".to_string()),
            block_id: Some(Nat::from(1u64)),
            number_confirmations: 1,
            minted_block: None,
            minted_block_timestamp: None,
            minter_fee: None,
            btc_fee: None,
            status: BridgeTransactionStatus::Created,
        };

        // Act: Insert transaction
        repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
            .unwrap();

        // Act: Retrieve transaction by ID
        let retrieved_tx = repo
            .get_bridge_transaction_by_id(&user_id, &"bridge1".to_string())
            .expect("BridgeTransaction not found");

        // Assert
        assert_eq!(retrieved_tx, bridge_tx);
    }
}
