// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_common::test_utils::random_id_string;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{BridgeTransactionStatus, BridgeType},
    dto::bitcoin::{CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_user_create_bridge_transaction_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let input = UpdateBridgeTransactionInputArg {
            bridge_id: random_id_string(),
            btc_txid: Some("exampletxid0000000000000000000000000000000000".to_string()),
            block_id: Some(Nat::from(100u32)),
            number_confirmations: Some(3),
            minted_block: Some(150),
            minted_block_timestamp: Some(Nat::from(1_632_000_000u32)),
            minter_fee: Some(Nat::from(1000u32)),
            btc_fee: Some(Nat::from(500u32)),
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
            icp_address: caller,
            btc_address: "tb1qexampleaddress0000000000000000000000000".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
        };

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Act: update
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: result.unwrap().unwrap().bridge_id,
            btc_txid: Some("updatedtxid0000000000000000000000000000000000".to_string()),
            block_id: Some(Nat::from(200u32)),
            number_confirmations: Some(5),
            minted_block: Some(250),
            minted_block_timestamp: Some(Nat::from(1_634_000_000u32)),
            minter_fee: Some(Nat::from(1500u32)),
            btc_fee: Some(Nat::from(700u32)),
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
