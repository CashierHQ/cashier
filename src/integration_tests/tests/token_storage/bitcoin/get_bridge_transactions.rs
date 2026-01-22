// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::BridgeType,
    dto::bitcoin::{CreateBridgeTransactionInputArg, GetUserBridgeTransactionsInputArg},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_user_get_bridge_transactions_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let input = GetUserBridgeTransactionsInputArg {
            start: None,
            limit: None,
            status: None,
        };

        // Act
        let result = token_storage_client
            .user_get_bridge_transactions(input)
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
async fn it_should_get_bridge_transactions_for_valid_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        for _ in 0..5 {
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

            let _ = token_storage_client
                .user_create_bridge_transaction(input)
                .await
                .expect("Failed to create bridge transaction");
        }

        // Act
        let input1 = GetUserBridgeTransactionsInputArg {
            start: Some(0),
            limit: Some(2),
            status: None,
        };
        let result1 = token_storage_client
            .user_get_bridge_transactions(input1)
            .await;

        let input2 = GetUserBridgeTransactionsInputArg {
            start: Some(2),
            limit: Some(2),
            status: None,
        };
        let result2 = token_storage_client
            .user_get_bridge_transactions(input2)
            .await;

        // Assert
        assert!(
            result1.is_ok(),
            "Expected successful bridge transactions retrieval"
        );
        let bridge_transactions = result1.unwrap();
        assert_eq!(
            bridge_transactions.len(),
            2,
            "Expected 2 bridge transactions on page 1"
        );

        assert!(
            result2.is_ok(),
            "Expected successful bridge transactions retrieval"
        );
        let bridge_transactions_page_2 = result2.unwrap();
        assert_eq!(
            bridge_transactions_page_2.len(),
            2,
            "Expected 2 bridge transactions on page 2"
        );
        Ok(())
    })
    .await
    .unwrap();
}
