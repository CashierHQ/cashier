// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    bitcoin::{
        bridge_address::BridgeAddress,
        bridge_transaction::{BridgeTransactionStatus, BridgeType},
    },
    dto::bitcoin::{
        CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg, UserBridgeTransactionDto,
    },
    error::CanisterError,
};

use crate::{
    bitcoin::{
        bridge::{factory::BridgeTransactionFactory, validator::BridgeTransactionValidator},
        ckbtc::traits::CkBtcMinterTrait,
    },
    repository::{
        Repositories, user_bridge_address::UserBridgeAddressRepository,
        user_bridge_transaction::UserBridgeTransactionRepository,
    },
};

pub struct UserCkBtcService<R: Repositories, M: CkBtcMinterTrait> {
    pub user_bridge_address_repository: UserBridgeAddressRepository<R::UserBridgeAddress>,
    pub user_bridge_transaction_repository:
        UserBridgeTransactionRepository<R::UserBridgeTransaction>,
    pub ckbtc_minter: M,
    pub bridge_transaction_validator: BridgeTransactionValidator<R>,
}

impl<R: Repositories, M: CkBtcMinterTrait> UserCkBtcService<R, M> {
    pub fn new(repo: &R, ckbtc_minter: M) -> Self {
        Self {
            user_bridge_address_repository: repo.user_bridge_address(),
            user_bridge_transaction_repository: repo.user_bridge_transaction(),
            ckbtc_minter,
            bridge_transaction_validator: BridgeTransactionValidator::new(repo),
        }
    }

    /// Get the BTC address for a user, fetching from the CkBtcMinter if not cached
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// # Returns
    /// * `Result<String, CanisterError>` - The BTC address if it exists
    pub async fn get_btc_address(
        &mut self,
        user: Principal,
        ckbtc_minter: Principal,
    ) -> Result<String, CanisterError> {
        if let Some(bridge_address) = self.user_bridge_address_repository.get_address(&user) {
            Ok(bridge_address.btc_address)
        } else {
            let address = self
                .ckbtc_minter
                .get_btc_address(user, ckbtc_minter)
                .await?;
            self.user_bridge_address_repository.set_address(
                user,
                BridgeAddress {
                    btc_address: address.clone(),
                    rune_address: None,
                },
            )?;

            Ok(address)
        }
    }

    /// Create a new bridge transaction for a user
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// * `input` - The input data for creating the bridge transaction
    /// # Returns
    /// * `Result<UserBridgeTransactionDto, CanisterError>` - The created bridge transaction
    pub async fn create_bridge_transaction(
        &mut self,
        user: Principal,
        input: CreateBridgeTransactionInputArg,
    ) -> Result<UserBridgeTransactionDto, CanisterError> {
        self.bridge_transaction_validator
            .validate_create_bridge_transaction(user, &input)?;

        let bridge_transaction = BridgeTransactionFactory::from_create_input(input)?;
        self.user_bridge_transaction_repository
            .upsert_bridge_transaction(
                user,
                bridge_transaction.bridge_id.clone(),
                bridge_transaction.clone(),
            )?;
        Ok(UserBridgeTransactionDto::from(bridge_transaction))
    }

    /// Update an existing bridge transaction for a user
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// * `input` - The input data for updating the bridge transaction
    /// # Returns
    /// * `Result<UserBridgeTransactionDto, CanisterError>` - The updated bridge transaction
    pub async fn update_bridge_transaction(
        &mut self,
        user: Principal,
        input: UpdateBridgeTransactionInputArg,
    ) -> Result<UserBridgeTransactionDto, CanisterError> {
        self.bridge_transaction_validator
            .validate_update_bridge_transaction(user, &input.bridge_id, &input)?;

        let mut bridge_transaction = self
            .user_bridge_transaction_repository
            .get_bridge_transaction_by_id(user, &input.bridge_id)
            .ok_or_else(|| {
                CanisterError::not_found("BridgeTransaction", &input.bridge_id.to_string())
            })?;

        // Update fields
        bridge_transaction.update(input);

        self.user_bridge_transaction_repository
            .upsert_bridge_transaction(
                user,
                bridge_transaction.bridge_id.clone(),
                bridge_transaction.clone(),
            )?;
        Ok(UserBridgeTransactionDto::from(bridge_transaction))
    }

    /// Get bridge transactions for a user with optional pagination
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// * `start` - Optional start index for pagination
    /// * `limit` - Optional limit for pagination
    /// # Returns
    /// * `Vec<UserBridgeTransactionDto>` - The list of bridge transactions
    pub async fn get_bridge_transactions(
        &self,
        user: Principal,
        start: Option<u32>,
        limit: Option<u32>,
        status: Option<BridgeTransactionStatus>,
        bridge_type: Option<BridgeType>,
    ) -> Vec<UserBridgeTransactionDto> {
        let transactions = self
            .user_bridge_transaction_repository
            .get_bridge_transactions(&user, start, limit, status, bridge_type);
        transactions
            .into_iter()
            .map(UserBridgeTransactionDto::from)
            .collect()
    }

    /// Get a specific bridge transaction for a user by bridge ID
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// * `bridge_id` - The bridge ID of the transaction
    /// # Returns
    /// * `Option<UserBridgeTransactionDto>` - The bridge transaction if found
    pub async fn get_bridge_transaction_by_id(
        &self,
        user: Principal,
        bridge_id: String,
    ) -> Option<UserBridgeTransactionDto> {
        self.user_bridge_transaction_repository
            .get_bridge_transaction_by_id(user, &bridge_id)
            .map(UserBridgeTransactionDto::from)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bitcoin::bridge::factory::BridgeTransactionFactory;
    use crate::bitcoin::ckbtc::ic_ckbtc_minter_client::tests::MockCkBtcMinterClient;
    use crate::repository::{Repositories, tests::TestRepositories};
    use candid::Nat;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::bitcoin::bridge_address::BridgeAddress;
    use token_storage_types::bitcoin::bridge_transaction::{
        BlockConfirmation, BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType,
    };

    fn fixture_of_import_create_input() -> CreateBridgeTransactionInputArg {
        CreateBridgeTransactionInputArg {
            btc_txid: Some("test_btc_txid".to_string()),
            icp_address: random_principal_id(),
            btc_address: "tb1qbtcaddress".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            created_at_ts: 100_000,
            ckbtc_block_id: None,
            status: None,
            vin: None,
            vout: None,
        }
    }

    fn fixture_of_export_create_input() -> CreateBridgeTransactionInputArg {
        CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "bc1qreceiver".to_string(),
            bridge_type: BridgeType::Export,
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "ckbtc".to_string(),
                amount: Nat::from(125_000u64),
                decimals: 8,
            }],
            deposit_fee: None,
            withdrawal_fee: Some(Nat::from(450u64)),
            btc_fee: Some(Nat::from(1200u64)),
            created_at_ts: 100_000,
            ckbtc_block_id: None,
            status: None,
            vin: None,
            vout: None,
        }
    }

    #[tokio::test]
    async fn it_should_fail_get_btc_address_due_to_minter_error() {
        // Arrange — mock has no address registered for the user
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);

        // Act
        let result = service
            .get_btc_address(user_id, random_principal_id())
            .await;

        // Assert
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CanisterError::NotFound(_)));
    }

    #[tokio::test]
    async fn it_should_get_btc_address_from_minter_and_cache_it() {
        // Arrange
        let repo = TestRepositories::new();
        let mut mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let expected_address = "btc_address_123".to_string();
        mock_minter.set_btc_address(user_id, expected_address.clone());
        let mut service = UserCkBtcService::new(&repo, mock_minter);

        // Act
        let address = service
            .get_btc_address(user_id, random_principal_id())
            .await
            .unwrap();

        // Assert — correct address returned
        assert_eq!(address, expected_address);
        // Assert — address cached in repository
        let cached = repo.user_bridge_address().get_address(&user_id).unwrap();
        assert_eq!(cached.btc_address, expected_address);
    }

    #[tokio::test]
    async fn it_should_get_btc_address_from_cache_on_second_call() {
        // Arrange — pre-populate cache; minter has no address so a cache miss
        // would fail, proving the cache is hit
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        repo.user_bridge_address()
            .set_address(
                user_id,
                BridgeAddress {
                    btc_address: "cached_address".to_string(),
                    rune_address: None,
                },
            )
            .unwrap();
        let mut service = UserCkBtcService::new(&repo, mock_minter);

        // Act
        let address = service
            .get_btc_address(user_id, random_principal_id())
            .await
            .unwrap();

        // Assert
        assert_eq!(address, "cached_address");
    }

    #[tokio::test]
    async fn it_should_fail_create_bridge_transaction_due_to_factory_error() {
        // Arrange — import with neither btc_txid nor ckbtc_block_id
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "tb1qbtcaddress".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = service.create_bridge_transaction(user_id, input).await;

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_txid or ckbtc_block_id is required for import"
        ));
    }

    #[tokio::test]
    async fn it_should_fail_create_bridge_transaction_due_to_duplicate_import() {
        // Arrange — create the bridge once, then try to create the same one again
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let input = fixture_of_import_create_input();
        service
            .create_bridge_transaction(user_id, input.clone())
            .await
            .unwrap();

        // Act
        let result = service.create_bridge_transaction(user_id, input).await;

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "A bridge transaction with the same btc_txid already exists"
        ));
    }

    #[tokio::test]
    async fn it_should_create_import_bridge_transaction() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let input = fixture_of_import_create_input();

        // Act
        let result = service
            .create_bridge_transaction(user_id, input.clone())
            .await
            .unwrap();

        // Assert
        assert_eq!(result.icp_address, input.icp_address);
        assert_eq!(result.btc_address, input.btc_address);
        assert_eq!(result.bridge_type, BridgeType::Import);
        assert_eq!(result.btc_txid, input.btc_txid);
        assert_eq!(result.status, BridgeTransactionStatus::Pending);
        assert_eq!(result.created_at_ts, input.created_at_ts);
    }

    #[tokio::test]
    async fn it_should_create_manual_import_bridge_transaction_via_ckbtc_block_id() {
        // Arrange — manual refresh flow: no btc_txid, bridge identified by ckbtc_block_id
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let ckbtc_block_id = 42u64;
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "tb1qbtcaddress".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "UTXO".to_string(),
                amount: Nat::from(50_000u64),
                decimals: 8,
            }],
            deposit_fee: Some(Nat::from(1000u64)),
            withdrawal_fee: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: Some(ckbtc_block_id),
            status: Some(BridgeTransactionStatus::Completed),
            vin: None,
            vout: None,
        };

        // Act
        let result = service
            .create_bridge_transaction(user_id, input)
            .await
            .unwrap();

        // Assert
        assert_eq!(result.bridge_id, format!("import_ckbtc_{}", ckbtc_block_id));
        assert_eq!(result.btc_txid, None);
        assert_eq!(result.ckbtc_block_id, Some(ckbtc_block_id));
        assert_eq!(result.status, BridgeTransactionStatus::Completed);
        assert_eq!(result.bridge_type, BridgeType::Import);
        // deposit fee (1000) deducted from asset amount (50_000)
        assert_eq!(result.total_amount, Some(Nat::from(49_000u64)));
    }

    #[tokio::test]
    async fn it_should_fail_update_bridge_transaction_due_to_bridge_not_found() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: "nonexistent".to_string(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = service
            .update_bridge_transaction(user_id, update_input)
            .await;

        // Assert
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CanisterError::NotFound(_)));
    }

    #[tokio::test]
    async fn it_should_fail_update_bridge_transaction_due_to_validator_error() {
        // Arrange — create an import bridge then try to set the same status
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let created = service
            .create_bridge_transaction(user_id, fixture_of_import_create_input())
            .await
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Pending), // same as current
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = service
            .update_bridge_transaction(user_id, update_input)
            .await;

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "status is already set to the same value"
        ));
    }

    #[tokio::test]
    async fn it_should_update_import_bridge_transaction() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let created = service
            .create_bridge_transaction(user_id, fixture_of_import_create_input())
            .await
            .unwrap();
        let block_confirmations = vec![
            BlockConfirmation {
                block_id: 1,
                block_timestamp: 1_620_000_000,
            },
            BlockConfirmation {
                block_id: 2,
                block_timestamp: 1_620_000_600,
            },
        ];
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: Some(100u64),
            block_timestamp: Some(1_620_001_200u64),
            block_confirmations: Some(block_confirmations.clone()),
            deposit_fee: Some(Nat::from(1000u32)),
            withdrawal_fee: Some(Nat::from(500u32)),
            btc_fee: Some(Nat::from(200u32)),
            retry_times: Some(1),
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let updated = service
            .update_bridge_transaction(user_id, update_input.clone())
            .await
            .unwrap();

        // Assert
        assert_eq!(updated.bridge_id, created.bridge_id);
        assert_eq!(updated.btc_txid, created.btc_txid);
        assert_eq!(updated.block_id, update_input.block_id);
        assert_eq!(
            updated.block_confirmations,
            update_input.block_confirmations.unwrap()
        );
        assert_eq!(updated.deposit_fee, update_input.deposit_fee);
        assert_eq!(updated.withdrawal_fee, update_input.withdrawal_fee);
        assert_eq!(updated.btc_fee, update_input.btc_fee);
        assert_eq!(updated.retry_times, update_input.retry_times.unwrap());
        assert_eq!(updated.status, update_input.status.unwrap());
    }

    #[tokio::test]
    async fn it_should_create_and_update_export_bridge_transaction() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);

        // Act — create export bridge
        let created = service
            .create_bridge_transaction(user_id, fixture_of_export_create_input())
            .await
            .unwrap();

        // Assert — initial state
        assert_eq!(created.bridge_type, BridgeType::Export);
        assert_eq!(created.btc_txid, None);
        assert_eq!(created.ckbtc_block_id, None);
        assert_eq!(created.block_id, None);
        assert_eq!(created.withdrawal_fee, Some(Nat::from(450u64)));
        assert_eq!(created.btc_fee, Some(Nat::from(1200u64)));
        assert_eq!(created.status, BridgeTransactionStatus::Created);

        // Act — transition Created → Pending (ckBTC withdrawal submitted)
        let pending_input = UpdateBridgeTransactionInputArg {
            bridge_id: created.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: Some(42u64),
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Pending),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };
        let pending = service
            .update_bridge_transaction(user_id, pending_input)
            .await
            .unwrap();

        // Assert
        assert_eq!(pending.ckbtc_block_id, Some(42u64));
        assert_eq!(pending.block_id, None);
        assert_eq!(pending.status, BridgeTransactionStatus::Pending);

        // Act — transition Pending → Completed (BTC confirmed on-chain)
        let completed_input = UpdateBridgeTransactionInputArg {
            bridge_id: pending.bridge_id.clone(),
            btc_txid: Some("btc-txid-1".to_string()),
            ckbtc_block_id: None,
            block_id: Some(840_000u64),
            block_timestamp: Some(1_720_000_000u64),
            block_confirmations: Some(vec![BlockConfirmation {
                block_id: 840_000u64,
                block_timestamp: 1_720_000_000u64,
            }]),
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };
        let completed = service
            .update_bridge_transaction(user_id, completed_input)
            .await
            .unwrap();

        // Assert
        assert_eq!(completed.btc_txid, Some("btc-txid-1".to_string()));
        assert_eq!(completed.status, BridgeTransactionStatus::Completed);
    }

    #[tokio::test]
    async fn it_should_get_bridge_transactions_with_pagination() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let service = UserCkBtcService::new(&repo, mock_minter);
        for i in 0..5 {
            let input = CreateBridgeTransactionInputArg {
                btc_txid: Some(format!("txid_{}", i)),
                icp_address: random_principal_id(),
                btc_address: format!("btc_address_{}", i),
                bridge_type: BridgeType::Import,
                asset_infos: vec![],
                deposit_fee: None,
                withdrawal_fee: None,
                btc_fee: None,
                created_at_ts: 0,
                ckbtc_block_id: None,
                status: None,
                vin: None,
                vout: None,
            };
            let mut tx = BridgeTransactionFactory::from_create_input(input).unwrap();
            tx.bridge_id = format!("bridge{}", i);
            repo.user_bridge_transaction()
                .upsert_bridge_transaction(user_id, tx.bridge_id.clone(), tx)
                .unwrap();
        }

        // Act
        let page_1 = service
            .get_bridge_transactions(user_id, Some(0), Some(2), None, None)
            .await;
        let page_2 = service
            .get_bridge_transactions(user_id, Some(2), Some(2), None, None)
            .await;

        // Assert
        assert_eq!(page_1.len(), 2);
        assert_eq!(page_1[0].bridge_id, "bridge4");
        assert_eq!(page_1[1].bridge_id, "bridge3");
        assert_eq!(page_2.len(), 2);
        assert_eq!(page_2[0].bridge_id, "bridge2");
        assert_eq!(page_2[1].bridge_id, "bridge1");
    }

    #[tokio::test]
    async fn it_should_get_bridge_transactions_filtered_by_bridge_type() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let service = UserCkBtcService::new(&repo, mock_minter);
        for i in 0..3 {
            let import_input = CreateBridgeTransactionInputArg {
                btc_txid: Some(format!("txid_import_{}", i)),
                icp_address: random_principal_id(),
                btc_address: format!("btc_import_{}", i),
                bridge_type: BridgeType::Import,
                asset_infos: vec![],
                deposit_fee: None,
                withdrawal_fee: None,
                btc_fee: None,
                created_at_ts: 0,
                ckbtc_block_id: None,
                status: None,
                vin: None,
                vout: None,
            };
            let mut import_tx = BridgeTransactionFactory::from_create_input(import_input).unwrap();
            import_tx.bridge_id = format!("import{}", i);
            repo.user_bridge_transaction()
                .upsert_bridge_transaction(user_id, import_tx.bridge_id.clone(), import_tx)
                .unwrap();

            let export_input = CreateBridgeTransactionInputArg {
                btc_txid: None,
                icp_address: random_principal_id(),
                btc_address: format!("btc_export_{}", i),
                bridge_type: BridgeType::Export,
                asset_infos: vec![BridgeAssetInfo {
                    asset_type: BridgeAssetType::BTC,
                    asset_id: "ckbtc".to_string(),
                    amount: Nat::from(1000u64),
                    decimals: 8,
                }],
                deposit_fee: None,
                withdrawal_fee: Some(Nat::from(450u64)),
                btc_fee: Some(Nat::from(1200u64)),
                created_at_ts: 0,
                ckbtc_block_id: None,
                status: None,
                vin: None,
                vout: None,
            };
            let mut export_tx = BridgeTransactionFactory::from_create_input(export_input).unwrap();
            export_tx.bridge_id = format!("export{}", i);
            repo.user_bridge_transaction()
                .upsert_bridge_transaction(user_id, export_tx.bridge_id.clone(), export_tx)
                .unwrap();
        }

        // Act
        let import_txs = service
            .get_bridge_transactions(user_id, None, None, None, Some(BridgeType::Import))
            .await;

        // Assert
        assert_eq!(import_txs.len(), 3);
        assert!(
            import_txs
                .iter()
                .all(|tx| tx.bridge_type == BridgeType::Import)
        );

        // Act
        let export_txs = service
            .get_bridge_transactions(user_id, None, None, None, Some(BridgeType::Export))
            .await;

        // Assert
        assert_eq!(export_txs.len(), 3);
        assert!(
            export_txs
                .iter()
                .all(|tx| tx.bridge_type == BridgeType::Export)
        );
    }

    #[tokio::test]
    async fn it_should_get_bridge_transaction_by_id() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let created = service
            .create_bridge_transaction(user_id, fixture_of_import_create_input())
            .await
            .unwrap();

        // Act
        let result = service
            .get_bridge_transaction_by_id(user_id, created.bridge_id.clone())
            .await;

        // Assert
        assert!(result.is_some());
        assert_eq!(result.unwrap().bridge_id, created.bridge_id);
    }

    #[tokio::test]
    async fn it_should_return_none_for_nonexistent_bridge_transaction_by_id() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let service = UserCkBtcService::new(&repo, mock_minter);

        // Act
        let result = service
            .get_bridge_transaction_by_id(user_id, "nonexistent-id".to_string())
            .await;

        // Assert
        assert!(result.is_none());
    }
}
