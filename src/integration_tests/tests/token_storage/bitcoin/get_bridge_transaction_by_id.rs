// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::test_utils::random_id_string;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType},
    dto::bitcoin::CreateBridgeTransactionInputArg,
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

fn import_bridge_input(caller: Principal) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: Some("test_txid_123".to_string()),
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
        created_at_ts: 100,
    }
}

#[tokio::test]
async fn it_should_fail_get_bridge_transaction_by_id_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let bridge_id = random_id_string();

        // Act
        let result = token_storage_client
            .user_get_bridge_transaction_by_id(bridge_id)
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
async fn it_should_get_import_bridge_transaction_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let created_bridge = token_storage_client
            .user_create_bridge_transaction(import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = token_storage_client
            .user_get_bridge_transaction_by_id(created_bridge.bridge_id.clone())
            .await;

        // Assert
        assert!(result.is_ok(), "Expected successful bridge transaction retrieval");
        let bridge = result.unwrap();
        assert!(bridge.is_some(), "Expected bridge transaction to exist");
        let bridge = bridge.unwrap();
        assert_eq!(bridge.bridge_id, created_bridge.bridge_id);
        assert_eq!(bridge.bridge_type, BridgeType::Import);
        assert_eq!(bridge.status, BridgeTransactionStatus::Pending);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_export_bridge_transaction_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let created_bridge = token_storage_client
            .user_create_bridge_transaction(export_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = token_storage_client
            .user_get_bridge_transaction_by_id(created_bridge.bridge_id.clone())
            .await;

        // Assert
        assert!(result.is_ok(), "Expected successful bridge transaction retrieval");
        let bridge = result.unwrap();
        assert!(bridge.is_some(), "Expected bridge transaction to exist");
        let bridge = bridge.unwrap();
        assert_eq!(bridge.bridge_id, created_bridge.bridge_id);
        assert_eq!(bridge.bridge_type, BridgeType::Export);
        assert_eq!(bridge.status, BridgeTransactionStatus::Created);

        Ok(())
    })
    .await
    .unwrap();
}
