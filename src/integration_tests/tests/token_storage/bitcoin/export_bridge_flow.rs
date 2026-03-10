// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use token_storage_types::{
    bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType,
    },
    dto::bitcoin::{CreateBridgeTransactionInputArg, GetUserBridgeTransactionsInputArg, UpdateBridgeTransactionInputArg},
    error::CanisterError,
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

fn export_create_input(caller: candid::Principal) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: None,
        icp_address: caller,
        btc_address: "tb1qexportreceiver0000000000000000000000000".to_string(),
        asset_infos: vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::BTC,
            asset_id: "ckbtc".to_string(),
            amount: Nat::from(125_000u64),
            decimals: 8,
        }],
        bridge_type: BridgeType::Export,
        deposit_fee: None,
        withdrawal_fee: Some(Nat::from(450u64)),
        created_at_ts: 100,
    }
}

#[tokio::test]
async fn it_should_create_export_bridge_transaction_for_valid_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let result = token_storage_client
            .user_create_bridge_transaction(export_create_input(caller))
            .await;

        assert!(result.is_ok(), "Expected successful export bridge creation");
        let bridge_transaction_result = result.unwrap();
        assert!(bridge_transaction_result.is_ok());
        let bridge_transaction = bridge_transaction_result.unwrap();

        assert_eq!(bridge_transaction.icp_address, caller);
        assert_eq!(bridge_transaction.bridge_type, BridgeType::Export);
        assert_eq!(bridge_transaction.btc_txid, None);
        assert_eq!(bridge_transaction.block_id, None);
        assert_eq!(bridge_transaction.withdrawal_fee, Some(Nat::from(450u64)));
        assert_eq!(bridge_transaction.status, BridgeTransactionStatus::Created);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_reject_export_bridge_transaction_with_initial_btc_txid() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let mut input = export_create_input(caller);
        input.btc_txid = Some("unexpected-txid".to_string());

        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        assert!(result.is_ok(), "Expected canister call to succeed with inner error");
        let bridge_transaction_result = result.unwrap();
        assert!(bridge_transaction_result.is_err());
        assert!(matches!(
            bridge_transaction_result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_txid must not be set when creating an export bridge"
        ));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_process_export_bridge_transaction_flow_via_public_apis() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let created_result = token_storage_client
            .user_create_bridge_transaction(export_create_input(caller))
            .await;
        let created_bridge = created_result.unwrap().unwrap();

        let created_bridges = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: Some(BridgeTransactionStatus::Created),
            })
            .await
            .unwrap();

        assert_eq!(created_bridges.len(), 1);
        assert_eq!(created_bridges[0].bridge_id, created_bridge.bridge_id);
        assert_eq!(created_bridges[0].bridge_type, BridgeType::Export);

        let pending_result = token_storage_client
            .user_update_bridge_transaction(UpdateBridgeTransactionInputArg {
                bridge_id: created_bridge.bridge_id.clone(),
                btc_txid: None,
                block_id: Some(42),
                block_timestamp: None,
                block_confirmations: None,
                deposit_fee: None,
                withdrawal_fee: None,
                retry_times: None,
                status: Some(BridgeTransactionStatus::Pending),
            })
            .await;
        let pending_bridge = pending_result.unwrap().unwrap();

        assert_eq!(pending_bridge.block_id, Some(42));
        assert_eq!(pending_bridge.status, BridgeTransactionStatus::Pending);

        let pending_bridges = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: Some(BridgeTransactionStatus::Pending),
            })
            .await
            .unwrap();

        assert_eq!(pending_bridges.len(), 1);
        assert_eq!(pending_bridges[0].bridge_id, created_bridge.bridge_id);

        let completed_result = token_storage_client
            .user_update_bridge_transaction(UpdateBridgeTransactionInputArg {
                bridge_id: created_bridge.bridge_id.clone(),
                btc_txid: Some("btc-export-txid-1".to_string()),
                block_id: None,
                block_timestamp: None,
                block_confirmations: None,
                deposit_fee: None,
                withdrawal_fee: None,
                retry_times: None,
                status: Some(BridgeTransactionStatus::Completed),
            })
            .await;
        let completed_bridge = completed_result.unwrap().unwrap();

        assert_eq!(
            completed_bridge.btc_txid,
            Some("btc-export-txid-1".to_string())
        );
        assert_eq!(completed_bridge.status, BridgeTransactionStatus::Completed);

        let completed_bridges = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: Some(BridgeTransactionStatus::Completed),
            })
            .await
            .unwrap();

        assert_eq!(completed_bridges.len(), 1);
        assert_eq!(completed_bridges[0].bridge_id, created_bridge.bridge_id);

        Ok(())
    })
    .await
    .unwrap();
}
