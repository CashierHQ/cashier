// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_structures::{DefaultMemoryImpl, VirtualMemory};
use ic_mple_utils::store::Storage;
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::{
    bitcoin::bridge_transaction::{BridgeTransaction, BridgeTransactionCodec},
    dto::bitcoin::GetBridgeTransactionsFilter,
};

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
        user_id: Principal,
        bridge_id: &str,
    ) -> Option<BridgeTransaction> {
        self.bridge_transaction_store.with_borrow(|store| {
            let transactions = store.get(&user_id).unwrap_or_default();
            transactions
                .into_iter()
                .find(|tx| tx.bridge_id == bridge_id)
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
        filter: GetBridgeTransactionsFilter,
    ) -> Vec<BridgeTransaction> {
        self.bridge_transaction_store.with_borrow(|store| {
            let mut transactions = store.get(user_id).unwrap_or_default();
            if let Some(status_filter) = filter.status {
                transactions.retain(|tx| tx.status == status_filter);
            }
            if let Some(bridge_type_filter) = filter.bridge_type {
                transactions.retain(|tx| tx.bridge_type == bridge_type_filter);
            }
            if let Some(asset_type_filter) = filter.asset_type {
                transactions.retain(|tx| {
                    tx.asset_infos
                        .iter()
                        .any(|a| a.asset_type == asset_type_filter)
                });
            }
            if let Some(rune_id_filter) = filter.rune_id {
                transactions
                    .retain(|tx| tx.asset_infos.iter().any(|a| a.asset_id == rune_id_filter));
            }

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
    use crate::repository::{Repositories, tests::TestRepositories};
    use candid::Nat;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::{
        bitcoin::bridge_transaction::{
            BridgeAssetInfo, BridgeAssetType, BridgeTransaction, BridgeTransactionStatus,
            BridgeType,
        },
        dto::bitcoin::GetBridgeTransactionsFilter,
    };

    #[test]
    fn it_should_insert_bridge_transactions() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let asset_infos = vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::BTC,
            asset_id: "btc".to_string(),
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
            ckbtc_block_id: None,
            block_id: Some(100u64),
            block_timestamp: Some(1620000000u64),
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            total_amount: None,
            created_at_ts: 10000u64,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        repo.upsert_bridge_transaction(user_id, bridge_tx_1.bridge_id.clone(), bridge_tx_1.clone())
            .unwrap();

        // Assert
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter::default(),
        );
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
            ckbtc_block_id: None,
            block_id: Some(100u64),
            block_timestamp: Some(1620000000u64),
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            total_amount: None,
            created_at_ts: 10000u64,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act: Insert initial transaction
        repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
            .unwrap();

        // Act: Update transaction status
        bridge_tx.status = BridgeTransactionStatus::Completed;
        repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
            .unwrap();

        // Assert
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter::default(),
        );
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
                ckbtc_block_id: None,
                block_id: Some(100u64 + i as u64),
                block_timestamp: Some(1620000000u64 + i as u64 * 60),
                block_confirmations: vec![],
                deposit_fee: None,
                withdrawal_fee: None,
                btc_fee: None,
                total_amount: None,
                created_at_ts: 10000u64 + i as u64,
                retry_times: 0,
                status: BridgeTransactionStatus::Created,
                omnity_ticket_id: None,
                vin: None,
                vout: None,
            };
            repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
                .unwrap();
        }

        // Act: Get first 2 transactions
        let transactions_page_1 = repo.get_bridge_transactions(
            &user_id,
            Some(0),
            Some(2),
            GetBridgeTransactionsFilter::default(),
        );

        // Act: Get next 2 transactions
        let transactions_page_2 = repo.get_bridge_transactions(
            &user_id,
            Some(2),
            Some(2),
            GetBridgeTransactionsFilter::default(),
        );

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
            ckbtc_block_id: None,
            block_id: Some(100u64),
            block_timestamp: Some(1620000000u64),
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            total_amount: None,
            created_at_ts: 10000u64,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act: Insert transaction
        repo.upsert_bridge_transaction(user_id, bridge_tx.bridge_id.clone(), bridge_tx.clone())
            .unwrap();

        // Act: Retrieve transaction by ID
        let retrieved_tx = repo
            .get_bridge_transaction_by_id(user_id, "bridge1")
            .expect("BridgeTransaction not found");

        // Assert
        assert_eq!(retrieved_tx, bridge_tx);
    }

    fn fixture_of_bridge_transaction(
        bridge_id: &str,
        bridge_type: BridgeType,
    ) -> BridgeTransaction {
        BridgeTransaction {
            bridge_id: bridge_id.to_string(),
            icp_address: random_principal_id(),
            btc_address: "btc1".to_string(),
            bridge_type,
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "btc".to_string(),
                amount: Nat::from(1000u64),
                decimals: 8,
            }],
            btc_txid: Some("txid1".to_string()),
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            total_amount: None,
            created_at_ts: 10000u64,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        }
    }

    #[test]
    fn it_should_get_bridge_transactions_filtered_by_bridge_type_import() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let import_tx_1 = fixture_of_bridge_transaction("import1", BridgeType::Import);
        let import_tx_2 = fixture_of_bridge_transaction("import2", BridgeType::Import);
        let export_tx_1 = fixture_of_bridge_transaction("export1", BridgeType::Export);
        let export_tx_2 = fixture_of_bridge_transaction("export2", BridgeType::Export);
        repo.upsert_bridge_transaction(user_id, import_tx_1.bridge_id.clone(), import_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, import_tx_2.bridge_id.clone(), import_tx_2)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, export_tx_1.bridge_id.clone(), export_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, export_tx_2.bridge_id.clone(), export_tx_2)
            .unwrap();

        // Act
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter {
                bridge_type: Some(BridgeType::Import),
                ..Default::default()
            },
        );

        // Assert
        assert_eq!(transactions.len(), 2);
        assert!(
            transactions
                .iter()
                .all(|tx| tx.bridge_type == BridgeType::Import)
        );
    }

    #[test]
    fn it_should_get_bridge_transactions_filtered_by_bridge_type_export() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let import_tx_1 = fixture_of_bridge_transaction("import1", BridgeType::Import);
        let import_tx_2 = fixture_of_bridge_transaction("import2", BridgeType::Import);
        let export_tx_1 = fixture_of_bridge_transaction("export1", BridgeType::Export);
        let export_tx_2 = fixture_of_bridge_transaction("export2", BridgeType::Export);
        repo.upsert_bridge_transaction(user_id, import_tx_1.bridge_id.clone(), import_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, import_tx_2.bridge_id.clone(), import_tx_2)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, export_tx_1.bridge_id.clone(), export_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, export_tx_2.bridge_id.clone(), export_tx_2)
            .unwrap();

        // Act
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter {
                bridge_type: Some(BridgeType::Export),
                ..Default::default()
            },
        );

        // Assert
        assert_eq!(transactions.len(), 2);
        assert!(
            transactions
                .iter()
                .all(|tx| tx.bridge_type == BridgeType::Export)
        );
    }

    #[test]
    fn it_should_get_bridge_transactions_with_no_bridge_type_filter() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let import_tx_1 = fixture_of_bridge_transaction("import1", BridgeType::Import);
        let import_tx_2 = fixture_of_bridge_transaction("import2", BridgeType::Import);
        let export_tx_1 = fixture_of_bridge_transaction("export1", BridgeType::Export);
        let export_tx_2 = fixture_of_bridge_transaction("export2", BridgeType::Export);
        repo.upsert_bridge_transaction(user_id, import_tx_1.bridge_id.clone(), import_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, import_tx_2.bridge_id.clone(), import_tx_2)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, export_tx_1.bridge_id.clone(), export_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, export_tx_2.bridge_id.clone(), export_tx_2)
            .unwrap();

        // Act
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter::default(),
        );

        // Assert
        assert_eq!(transactions.len(), 4);
    }

    fn fixture_of_rune_bridge_transaction(bridge_id: &str, rune_id: &str) -> BridgeTransaction {
        use candid::Nat;
        BridgeTransaction {
            bridge_id: bridge_id.to_string(),
            icp_address: random_principal_id(),
            btc_address: "btc1".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::Runes,
                asset_id: rune_id.to_string(),
                amount: Nat::from(1000u64),
                decimals: 8,
            }],
            btc_txid: Some("txid1".to_string()),
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            total_amount: None,
            created_at_ts: 10000u64,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        }
    }

    #[test]
    fn it_should_get_bridge_transactions_filtered_by_asset_type_btc() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let btc_tx_1 = fixture_of_bridge_transaction("btc1", BridgeType::Import);
        let btc_tx_2 = fixture_of_bridge_transaction("btc2", BridgeType::Import);
        let rune_tx_1 = fixture_of_rune_bridge_transaction("rune1", "UNCOMMON•GOODS");
        let rune_tx_2 = fixture_of_rune_bridge_transaction("rune2", "DOG•GO•TO•THE•MOON");
        repo.upsert_bridge_transaction(user_id, btc_tx_1.bridge_id.clone(), btc_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, btc_tx_2.bridge_id.clone(), btc_tx_2)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, rune_tx_1.bridge_id.clone(), rune_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, rune_tx_2.bridge_id.clone(), rune_tx_2)
            .unwrap();

        // Act
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter {
                asset_type: Some(BridgeAssetType::BTC),
                ..Default::default()
            },
        );

        // Assert
        assert_eq!(transactions.len(), 2);
        assert!(transactions.iter().all(|tx| {
            tx.asset_infos
                .iter()
                .any(|a| a.asset_type == BridgeAssetType::BTC)
        }));
    }

    #[test]
    fn it_should_get_bridge_transactions_filtered_by_asset_type_runes() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let btc_tx_1 = fixture_of_bridge_transaction("btc1", BridgeType::Import);
        let btc_tx_2 = fixture_of_bridge_transaction("btc2", BridgeType::Import);
        let rune_tx_1 = fixture_of_rune_bridge_transaction("rune1", "UNCOMMON•GOODS");
        let rune_tx_2 = fixture_of_rune_bridge_transaction("rune2", "DOG•GO•TO•THE•MOON");
        repo.upsert_bridge_transaction(user_id, btc_tx_1.bridge_id.clone(), btc_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, btc_tx_2.bridge_id.clone(), btc_tx_2)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, rune_tx_1.bridge_id.clone(), rune_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, rune_tx_2.bridge_id.clone(), rune_tx_2)
            .unwrap();

        // Act
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter {
                asset_type: Some(BridgeAssetType::Runes),
                ..Default::default()
            },
        );

        // Assert
        assert_eq!(transactions.len(), 2);
        assert!(transactions.iter().all(|tx| {
            tx.asset_infos
                .iter()
                .any(|a| a.asset_type == BridgeAssetType::Runes)
        }));
    }

    #[test]
    fn it_should_get_bridge_transactions_filtered_by_rune_id() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let rune_tx_1 = fixture_of_rune_bridge_transaction("rune1", "UNCOMMON•GOODS");
        let rune_tx_2 = fixture_of_rune_bridge_transaction("rune2", "DOG•GO•TO•THE•MOON");
        repo.upsert_bridge_transaction(user_id, rune_tx_1.bridge_id.clone(), rune_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, rune_tx_2.bridge_id.clone(), rune_tx_2)
            .unwrap();

        // Act
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter {
                rune_id: Some("UNCOMMON•GOODS".to_string()),
                ..Default::default()
            },
        );

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].asset_infos[0].asset_id, "UNCOMMON•GOODS");
    }

    #[test]
    fn it_should_get_bridge_transactions_with_no_asset_type_filter() {
        // Arrange
        let mut repo = TestRepositories::new().user_bridge_transaction();
        let user_id = random_principal_id();
        let btc_tx_1 = fixture_of_bridge_transaction("btc1", BridgeType::Import);
        let btc_tx_2 = fixture_of_bridge_transaction("btc2", BridgeType::Import);
        let rune_tx_1 = fixture_of_rune_bridge_transaction("rune1", "UNCOMMON•GOODS");
        let rune_tx_2 = fixture_of_rune_bridge_transaction("rune2", "DOG•GO•TO•THE•MOON");
        repo.upsert_bridge_transaction(user_id, btc_tx_1.bridge_id.clone(), btc_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, btc_tx_2.bridge_id.clone(), btc_tx_2)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, rune_tx_1.bridge_id.clone(), rune_tx_1)
            .unwrap();
        repo.upsert_bridge_transaction(user_id, rune_tx_2.bridge_id.clone(), rune_tx_2)
            .unwrap();

        // Act
        let transactions = repo.get_bridge_transactions(
            &user_id,
            None,
            None,
            GetBridgeTransactionsFilter::default(),
        );

        // Assert
        assert_eq!(transactions.len(), 4);
    }
}
