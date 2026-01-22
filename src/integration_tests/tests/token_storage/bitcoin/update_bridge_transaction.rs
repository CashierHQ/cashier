// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_common::test_utils::random_id_string;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{BlockConfirmation, BridgeTransactionStatus, BridgeType},
    dto::bitcoin::{CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_user_create_bridge_transaction_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
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
        let input = UpdateBridgeTransactionInputArg {
            bridge_id: random_id_string(),
            btc_txid: Some("exampletxid0000000000000000000000000000000000".to_string()),
            block_id: Some(100u64),
            block_timestamp: Some(1620001200u64),
            block_confirmations: Some(block_confirmations),
            deposit_fee: Some(Nat::from(1000u32)),
            withdrawal_fee: Some(Nat::from(500u32)),
            status: Some(BridgeTransactionStatus::Completed),
        };

        // Act
        let result = token_storage_client
            .user_update_bridge_transaction(input)
            .await;

        // Assert
        assert!(result.is_err(), "Expected error for anonymous user");
        if let Err(CanisterClientError::PocketIcTestError(err)) = result {
            assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_update_bridge_transaction_for_valid_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_txid_123".to_string()),
            icp_address: caller,
            btc_address: "tb1qexampleaddress0000000000000000000000000".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
            deposit_fee: None,
            withdrawal_fee: None,
            created_at_ts: 0,
        };

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Act: update
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
            bridge_id: result.unwrap().unwrap().bridge_id,
            btc_txid: Some("updatedtxid0000000000000000000000000000000000".to_string()),
            block_id: Some(200u64),
            block_timestamp: Some(1620001200u64),
            block_confirmations: Some(block_confirmations),
            deposit_fee: Some(Nat::from(1500u32)),
            withdrawal_fee: Some(Nat::from(700u32)),
            status: Some(BridgeTransactionStatus::Completed),
        };

        let update_result = token_storage_client
            .user_update_bridge_transaction(update_input)
            .await;

        // Assert
        assert!(
            update_result.is_ok(),
            "Expected successful bridge transaction update"
        );
        let updated_transaction_result = update_result.unwrap();
        assert!(
            updated_transaction_result.is_ok(),
            "Expected updated bridge transaction in result"
        );
        let updated_transaction = updated_transaction_result.unwrap();
        assert_eq!(
            updated_transaction.btc_txid,
            Some("updatedtxid0000000000000000000000000000000000".to_string())
        );
        Ok(())
    })
    .await
    .unwrap();
}
