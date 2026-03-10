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

    /**
     * Validate the creation input for a bridge transaction
     * # Arguments
     * * `user_id` - The principal ID of the user creating the bridge transaction
     * * `input` - The input data for creating the bridge transaction
     * # Returns
     * * `Ok(())` if the input is valid
     * * `Err(CanisterError)` if the input is invalid
     */
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
    use crate::repository::{tests::TestRepositories, Repositories};
    use candid::Nat;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus,
    };

    #[test]
    fn it_should_reject_duplicate_import_bridge() {
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("txid-1".to_string()),
            icp_address: random_principal_id(),
            btc_address: "btc-address".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            created_at_ts: 0,
        };

        let bridge = BridgeTransactionFactory::from_create_input(input.clone()).unwrap();
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge.bridge_id.clone(), bridge)
            .unwrap();

        let result = validator.validate_create_bridge_transaction(user_id, &input);

        assert!(result.is_err());
    }

    #[test]
    fn it_should_allow_export_bridge_without_duplicate_lookup() {
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let input = CreateBridgeTransactionInputArg {
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
            created_at_ts: 0,
        };

        let result = validator.validate_create_bridge_transaction(user_id, &input);

        assert!(result.is_ok());
    }

    #[test]
    fn it_should_allow_export_bridge_lifecycle_updates() {
        let repo = TestRepositories::new();
        let validator = BridgeTransactionValidator::new(&repo);
        let user_id = random_principal_id();
        let create_input = CreateBridgeTransactionInputArg {
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
            created_at_ts: 0,
        };

        let bridge = BridgeTransactionFactory::from_create_input(create_input).unwrap();
        let bridge_id = bridge.bridge_id.clone();
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), bridge)
            .unwrap();

        let pending_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: None,
            block_id: Some(42),
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Pending),
        };
        assert!(validator
            .validate_update_bridge_transaction(user_id, &bridge_id, &pending_input)
            .is_ok());

        let mut stored = repo
            .user_bridge_transaction()
            .get_bridge_transaction_by_id(user_id, &bridge_id)
            .unwrap();
        stored.update(pending_input);
        repo.user_bridge_transaction()
            .upsert_bridge_transaction(user_id, bridge_id.clone(), stored)
            .unwrap();

        let completed_input = UpdateBridgeTransactionInputArg {
            bridge_id: bridge_id.clone(),
            btc_txid: Some("btc-txid-1".to_string()),
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Completed),
        };
        assert!(validator
            .validate_update_bridge_transaction(user_id, &bridge_id, &completed_input)
            .is_ok());
    }
}
