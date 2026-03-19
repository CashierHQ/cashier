// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType,
    },
    dto::bitcoin::{CreateBridgeTransactionInputArg, GetUserBridgeTransactionsInputArg},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

fn import_bridge_input(caller: Principal, txid: String) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: Some(txid),
        icp_address: caller,
        btc_address: "tb1qexampleaddress0000000000000000000000000".to_string(),
        asset_infos: vec![],
        bridge_type: BridgeType::Import,
        deposit_fee: None,
        withdrawal_fee: None,
        btc_fee: None,
        created_at_ts: 0,
    }
}

fn export_bridge_input(caller: Principal) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: None,
        icp_address: caller,
        btc_address: "tb1qexportreceiver0000000000000000000000000".to_string(),
        asset_infos: vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::BTC,
            asset_id: "ckbtc".to_string(),
            amount: 125_000u64.into(),
            decimals: 8,
        }],
        bridge_type: BridgeType::Export,
        deposit_fee: None,
        withdrawal_fee: Some(450u64.into()),
        btc_fee: Some(1200u64.into()),
        created_at_ts: 1,
    }
}

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
async fn it_should_get_bridge_transactions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        for i in 0..5 {
            let input = import_bridge_input(caller, format!("test_txid_{}", i));

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

#[tokio::test]
async fn it_should_get_bridge_transactions_filtered_by_status_for_import_and_export() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let import_input = import_bridge_input(caller, "test_txid_import".to_string());
        let import_bridge = token_storage_client
            .user_create_bridge_transaction(import_input)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(import_bridge.status, BridgeTransactionStatus::Pending);

        let export_input = export_bridge_input(caller);
        let export_bridge = token_storage_client
            .user_create_bridge_transaction(export_input)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(export_bridge.status, BridgeTransactionStatus::Created);

        // Act
        let pending_bridges = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: Some(BridgeTransactionStatus::Pending),
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(pending_bridges.len(), 1);
        assert_eq!(pending_bridges[0].bridge_id, import_bridge.bridge_id);

        // Act
        let created_bridges = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: Some(BridgeTransactionStatus::Created),
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(created_bridges.len(), 1);
        assert_eq!(created_bridges[0].bridge_id, export_bridge.bridge_id);

        Ok(())
    })
    .await
    .unwrap();
}
