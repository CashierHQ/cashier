// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    bitcoin::{
        bridge_address::BridgeAddress,
        bridge_transaction::{BridgeTransaction, BridgeTransactionMapper},
    },
    dto::bitcoin::{
        CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg, UserBridgeTransactionDto,
    },
    error::CanisterError,
};

use crate::bitcoin::{
    bridge_transaction_validator::BridgeTransactionValidator, traits::CkBtcMinterTrait,
};
use crate::repository::{
    Repositories, user_bridge_address::UserBridgeAddressRepository,
    user_bridge_transaction::UserBridgeTransactionRepository,
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

        let bridge_transaction = BridgeTransactionMapper::from_create_input(input)?;
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
    ) -> Vec<UserBridgeTransactionDto> {
        let transactions = self
            .user_bridge_transaction_repository
            .get_bridge_transactions(&user, start, limit);
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
    use crate::bitcoin::ic_ckbtc_minter_client::tests::MockCkBtcMinterClient;
    use crate::repository::{Repositories, tests::TestRepositories};
    use candid::Nat;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::bitcoin::bridge_transaction::{
        BlockConfirmation, BridgeTransactionStatus, BridgeType,
    };

    #[tokio::test]
    async fn it_should_get_btc_address() {
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

        // Assert
        assert_eq!(address, expected_address);

        // Act: Verify caching in repository
        let cached_address = repo.user_bridge_address().get_address(&user_id).unwrap();

        // Assert
        assert_eq!(cached_address.btc_address, expected_address);
    }

    #[tokio::test]
    async fn it_should_create_bridge_transaction() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_btc_txid".to_string()),
            icp_address: random_principal_id(),
            btc_address: "btc_address_123".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            created_at_ts: 0,
        };
        let created_ts = 1620000000u64;

        // Act
        let result = service
            .create_bridge_transaction(user_id, input.clone())
            .await
            .unwrap();

        // Assert
        assert_eq!(result.icp_address, input.icp_address);
        assert_eq!(result.btc_address, input.btc_address);
        assert_eq!(result.bridge_type, input.bridge_type);
        assert_eq!(result.asset_infos, input.asset_infos);
        assert_eq!(result.created_at_ts, created_ts);
    }

    #[tokio::test]
    async fn it_should_update_bridge_transaction() {
        // Arrange
        let repo = TestRepositories::new();
        let mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let mut service = UserCkBtcService::new(&repo, mock_minter);
        let create_input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_btc_txid".to_string()),
            icp_address: random_principal_id(),
            btc_address: "btc_address_123".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            created_at_ts: 0,
        };
        let created_ts = 1620000000u64;

        let created_transaction = service
            .create_bridge_transaction(user_id, create_input)
            .await
            .unwrap();

        let block_confirmations = vec![
            BlockConfirmation {
                block_id: 1,
                block_timestamp: 1620000000,
            },
            BlockConfirmation {
                block_id: 2,
                block_timestamp: 1620000600,
            },
        ];
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_transaction.bridge_id.clone(),
            btc_txid: Some("new_btc_txid".to_string()),
            block_id: Some(100u64),
            block_timestamp: Some(1620001200u64),
            block_confirmations: Some(block_confirmations.clone()),
            deposit_fee: Some(Nat::from(1000u32)),
            withdrawal_fee: Some(Nat::from(500u32)),
            status: Some(BridgeTransactionStatus::Completed),
        };

        // Act
        let updated_transaction = service
            .update_bridge_transaction(user_id, update_input.clone())
            .await
            .unwrap();

        // Assert
        assert_eq!(updated_transaction.bridge_id, created_transaction.bridge_id);
        assert_eq!(updated_transaction.btc_txid, update_input.btc_txid);
        assert_eq!(updated_transaction.block_id, update_input.block_id);
        assert_eq!(
            updated_transaction.block_confirmations,
            update_input.block_confirmations.unwrap()
        );
        assert_eq!(updated_transaction.deposit_fee, update_input.deposit_fee);
        assert_eq!(
            updated_transaction.withdrawal_fee,
            update_input.withdrawal_fee
        );
        assert_eq!(updated_transaction.status, update_input.status.unwrap());
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
                created_at_ts: 0,
            };
            let mut transaction = BridgeTransactionMapper::from_create_input(input).unwrap();
            transaction.bridge_id = format!("bridge{}", i);
            repo.user_bridge_transaction()
                .upsert_bridge_transaction(user_id, transaction.bridge_id.clone(), transaction)
                .unwrap();
        }

        // Act
        let transactions_page_1 = service
            .get_bridge_transactions(user_id, Some(0), Some(2))
            .await;
        let transactions_page_2 = service
            .get_bridge_transactions(user_id, Some(2), Some(2))
            .await;

        // Assert
        assert_eq!(transactions_page_1.len(), 2);
        assert_eq!(transactions_page_1[0].bridge_id, "bridge4");
        assert_eq!(transactions_page_1[1].bridge_id, "bridge3");
        assert_eq!(transactions_page_2.len(), 2);
        assert_eq!(transactions_page_2[0].bridge_id, "bridge2");
        assert_eq!(transactions_page_2[1].bridge_id, "bridge1");
    }
}
