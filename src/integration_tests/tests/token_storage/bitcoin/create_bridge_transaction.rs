// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::test_utils::random_principal_id;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::BridgeType, dto::bitcoin::CreateBridgeTransactionInputArg,
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_user_create_bridge_transaction_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_txid_123".to_string()),
            icp_address: random_principal_id(),
            btc_address: "tb1qexampleaddress0000000000000000000000000".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
            created_at_ts: 0,
        };

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
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
async fn it_should_create_bridge_transaction_for_valid_user() {
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
            created_at_ts: 0,
        };

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected successful bridge transaction creation"
        );
        let bridge_transaction_result = result.unwrap();
        assert!(
            bridge_transaction_result.is_ok(),
            "Expected bridge transaction in result"
        );
        let bridge_transaction = bridge_transaction_result.unwrap();
        assert_eq!(bridge_transaction.icp_address, caller);
        assert_eq!(
            bridge_transaction.btc_address,
            "tb1qexampleaddress0000000000000000000000000".to_string()
        );
        assert_eq!(bridge_transaction.bridge_type, BridgeType::Import);
        Ok(())
    })
    .await
    .unwrap();
}
