// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    bitcoin::bridge_transaction::{BridgeTransactionStatus, BridgeType},
    dto::bitcoin::{CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg},
    error::CanisterError,
};

use crate::{
    bitcoin::bridge::factory::BridgeTransactionFactory,
    repository::{Repositories, user_bridge_transaction::UserBridgeTransactionRepository},
};

pub struct BridgeTransactionValidator<R: Repositories> {
    repository: UserBridgeTransactionRepository<R::UserBridgeTransaction>,
}

impl<R: Repositories> BridgeTransactionValidator<R> {
    pub fn new(repositories: &R) -> Self {
        Self {
            repository: repositories.user_bridge_transaction(),
        }
    }

    /// Validate the creation input for a bridge transaction
    /// # Arguments
    /// * `user_id` - The principal ID of the user creating the bridge transaction
    /// * `input` - The input data for creating the bridge transaction
    /// # Returns
    /// * `Ok(())` if the input is valid
    /// * `Err(CanisterError)` if the input is invalid
    pub fn validate_create_bridge_transaction(
        &self,
        user_id: Principal,
        input: &CreateBridgeTransactionInputArg,
    ) -> Result<(), CanisterError> {
        if input.bridge_type == BridgeType::Import {
            let new_bridge_transaction =
                BridgeTransactionFactory::from_create_input(input.clone())?;

            if self
                .repository
                .get_bridge_transaction_by_id(user_id, new_bridge_transaction.bridge_id.as_str())
                .is_some()
            {
                return Err(CanisterError::ValidationErrors(
                    "A bridge transaction with the same btc_txid already exists".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Validate the update input for a bridge transaction
    /// # Arguments
    /// * `user_id` - The principal ID of the user updating the bridge transaction
    /// * `bridge_id` - The ID of the bridge transaction to be updated
    /// * `input` - The input data for updating the bridge transaction
    /// # Returns
    /// * `Ok(())` if the input is valid
    /// * `Err(CanisterError)` if the input is invalid
    pub fn validate_update_bridge_transaction(
        &self,
        user_id: Principal,
        bridge_id: &str,
        input: &UpdateBridgeTransactionInputArg,
    ) -> Result<(), CanisterError> {
        let existing_transaction = self
            .repository
            .get_bridge_transaction_by_id(user_id, bridge_id)
            .ok_or_else(|| {
                CanisterError::NotFound(format!(
                    "Bridge transaction with id {} not found",
                    bridge_id
                ))
            })?;

        // Validate btc_txid update
        if let Some(_btc_txid) = input.btc_txid.clone()
            && existing_transaction.btc_txid.is_some()
        {
            return Err(CanisterError::ValidationErrors(
                "btc_txid is already set and cannot be updated".to_string(),
            ));
        }

        if let Some(_ckbtc_block_id) = input.ckbtc_block_id
            && existing_transaction.ckbtc_block_id.is_some()
        {
            return Err(CanisterError::ValidationErrors(
                "ckbtc_block_id is already set and cannot be updated".to_string(),
            ));
        }

        if let Some(_block_id) = input.block_id
            && existing_transaction.block_id.is_some()
        {
            return Err(CanisterError::ValidationErrors(
                "block_id is already set and cannot be updated".to_string(),
            ));
        }

        if let Some(_block_timestamp) = input.block_timestamp
            && existing_transaction.block_timestamp.is_some()
        {
            return Err(CanisterError::ValidationErrors(
                "block_timestamp is already set and cannot be updated".to_string(),
            ));
        }

        if let Some(block_confirmations) = input.block_confirmations.clone()
            && existing_transaction.block_confirmations.len() == block_confirmations.len()
        {
            return Err(CanisterError::ValidationErrors(
                "block_confirmations are already set with the same length".to_string(),
            ));
        }

        if let Some(_deposit_fee) = input.deposit_fee.clone()
            && existing_transaction.deposit_fee.is_some()
        {
            return Err(CanisterError::ValidationErrors(
                "deposit_fee is already set and cannot be updated".to_string(),
            ));
        }

        if let Some(_withdrawal_fee) = input.withdrawal_fee.clone()
            && existing_transaction.withdrawal_fee.is_some()
        {
            return Err(CanisterError::ValidationErrors(
                "withdrawal_fee is already set and cannot be updated".to_string(),
            ));
        }

        if let Some(_btc_fee) = input.btc_fee.clone()
            && existing_transaction.btc_fee.is_some()
        {
            return Err(CanisterError::ValidationErrors(
                "btc_fee is already set and cannot be updated".to_string(),
            ));
        }

        if let Some(retry_times) = input.retry_times
            && existing_transaction.retry_times >= retry_times
        {
            return Err(CanisterError::ValidationErrors(
                "retry_times can only be increased".to_string(),
            ));
        }

        if let Some(status) = input.status.clone() {
            if existing_transaction.status == status {
                return Err(CanisterError::ValidationErrors(
                    "status is already set to the same value".to_string(),
                ));
            } else if existing_transaction.status == BridgeTransactionStatus::Completed {
                return Err(CanisterError::ValidationErrors(
                    "Cannot update status of a completed transaction".to_string(),
                ));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};
    use candid::{Nat, Principal};
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::bitcoin::bridge_transaction::{
        BlockConfirmation, BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus,
    };

    fn fixture_of_import_create_input(icp_address: Principal) -> CreateBridgeTransactionInputArg {
        CreateBridgeTransactionInputArg {
            btc_txid: Some("txid-1".to_string()),
            icp_address,
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
        }
    }

    fn fixture_of_export_create_input(icp_address: Principal) -> CreateBridgeTransactionInputArg {
        CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address,
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
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            vin: None,
            vout: None,
        }
    }

    /// Create a bridge from `input`, store it, and return its bridge_id.
    fn store_bridge(
        repo: &TestRepositories,
        user_id: Principal,
        input: CreateBridgeTransactionInputArg,
    ) -> String {
        let bridge = BridgeTransactionFactory::from_create_input(input).unwrap();
        let bridge_id = bridge.bridge_id.clone();
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), bridge)
            .unwrap();
        bridge_id
    }

    #[test]
    fn it_should_fail_validate_create_import_bridge_due_to_factory_error() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
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
            ckbtc_block_id: None, // neither btc_txid nor ckbtc_block_id
            status: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = validator.validate_create_bridge_transaction(user_id, &input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_txid or ckbtc_block_id is required for import"
        ));
    }

    #[test]
    fn it_should_fail_validate_create_import_bridge_due_to_duplicate() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let input = fixture_of_import_create_input(random_principal_id());
        store_bridge(&repo, user_id, input.clone());

        // Act
        let result = validator.validate_create_bridge_transaction(user_id, &input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "A bridge transaction with the same btc_txid already exists"
        ));
    }

    #[test]
    fn it_should_validate_create_import_bridge() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let input = fixture_of_import_create_input(random_principal_id());

        // Act
        let result = validator.validate_create_bridge_transaction(user_id, &input);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_validate_create_export_bridge_without_duplicate_lookup() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        // Store an export bridge first — duplicate check is skipped for Export
        let input = fixture_of_export_create_input(random_principal_id());
        store_bridge(&repo, user_id, input.clone());

        // Act — creating a second export bridge should still pass validation
        let result = validator.validate_create_bridge_transaction(user_id, &input);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_bridge_not_found() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: "nonexistent-id".to_string(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, "nonexistent-id", &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::NotFound(message)
                if message.contains("nonexistent-id")
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_btc_txid_already_set() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        // Mark btc_txid on the stored bridge by applying an update
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.btc_txid = Some("existing-txid".to_string());
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: Some("new-txid".to_string()),
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_txid is already set and cannot be updated"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_ckbtc_block_id_already_set() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_export_create_input(random_principal_id()),
        );
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.ckbtc_block_id = Some(42u64);
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: Some(99u64),
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "ckbtc_block_id is already set and cannot be updated"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_block_id_already_set() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.block_id = Some(840_000u64);
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: Some(840_001u64),
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "block_id is already set and cannot be updated"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_block_timestamp_already_set() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.block_timestamp = Some(1_720_000_000u64);
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: Some(1_720_000_001u64),
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "block_timestamp is already set and cannot be updated"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_same_block_confirmations_length() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        let confirmation = BlockConfirmation {
            block_id: 840_000u64,
            block_timestamp: 1_720_000_000u64,
        };
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.block_confirmations = vec![confirmation.clone()];
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: Some(vec![confirmation]),
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "block_confirmations are already set with the same length"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_deposit_fee_already_set() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.deposit_fee = Some(Nat::from(1000u64));
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: Some(Nat::from(2000u64)),
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "deposit_fee is already set and cannot be updated"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_withdrawal_fee_already_set() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_export_create_input(random_principal_id()),
        );
        // withdrawal_fee is already set by the export fixture (450)
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: Some(Nat::from(500u64)),
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "withdrawal_fee is already set and cannot be updated"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_btc_fee_already_set() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_export_create_input(random_principal_id()),
        );
        // btc_fee is already set by the export fixture (1200)
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: Some(Nat::from(1500u64)),
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_fee is already set and cannot be updated"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_retry_times_not_increasing() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.retry_times = 2;
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: Some(2), // same value, not increasing
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "retry_times can only be increased"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_same_status() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        // Import bridge starts as Pending
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
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

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "status is already set to the same value"
        ));
    }

    #[test]
    fn it_should_fail_validate_update_bridge_due_to_updating_completed_status() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_import_create_input(random_principal_id()),
        );
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.status = BridgeTransactionStatus::Completed;
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Failed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result =
            validator.validate_update_bridge_transaction(user_id, &bridge_id, &update_input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "Cannot update status of a completed transaction"
        ));
    }

    #[test]
    fn it_should_validate_export_bridge_lifecycle_updates() {
        // Arrange
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let bridge_id = store_bridge(
            &repo,
            user_id,
            fixture_of_export_create_input(random_principal_id()),
        );

        // Act — transition Created → Pending (set ckbtc_block_id)
        let pending_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: Some(42),
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

        // Assert
        assert!(
            validator
                .validate_update_bridge_transaction(user_id, &bridge_id, &pending_input)
                .is_ok()
        );

        // Arrange — apply pending update to stored bridge
        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.update(pending_input);
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();

        // Act — transition Pending → Completed (set btc_txid, block_id, etc.)
        let completed_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: Some("btc-txid-1".to_string()),
            ckbtc_block_id: None,
            block_id: Some(840_000),
            block_timestamp: Some(1_720_000_000),
            block_confirmations: Some(vec![BlockConfirmation {
                block_id: 840_000,
                block_timestamp: 1_720_000_000,
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

        // Assert
        assert!(
            validator
                .validate_update_bridge_transaction(user_id, &bridge_id, &completed_input)
                .is_ok()
        );
    }
}
