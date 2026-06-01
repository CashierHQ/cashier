// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::test_utils::random_id_string;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType, UTXO,
    },
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
        deposit_fee_btc_sats: None,
        withdrawal_fee_btc_sats: None,
        withdrawal_fee_icp_e8s: None,
        btc_fee: None,
        created_at_ts: 0,
        ckbtc_block_id: None,
        status: None,
        omnity_ticket_id: None,
        vin: None,
        vout: None,
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
        deposit_fee_btc_sats: None,
        withdrawal_fee_btc_sats: Some(450u64.into()),
        withdrawal_fee_icp_e8s: None,
        btc_fee: Some(1200u64.into()),
        created_at_ts: 100,
        ckbtc_block_id: None,
        status: None,
        omnity_ticket_id: None,
        vin: None,
        vout: None,
    }
}

fn fixture_of_runes_import_bridge_input(caller: Principal) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: Some("rune_txid_123".to_string()),
        icp_address: caller,
        btc_address: "tb1qrunereceiver0000000000000000000000000".to_string(),
        asset_infos: vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::Runes,
            asset_id: "UNCOMMON•GOODS".to_string(),
            amount: 50_000u64.into(),
            decimals: 8,
        }],
        bridge_type: BridgeType::Import,
        deposit_fee_btc_sats: Some(1_000u64.into()),
        withdrawal_fee_btc_sats: None,
        withdrawal_fee_icp_e8s: None,
        btc_fee: None,
        created_at_ts: 200,
        ckbtc_block_id: None,
        status: None,
        omnity_ticket_id: None,
        vin: Some(vec![UTXO {
            txid: "vin-txid-1".to_string(),
            vout: 0,
        }]),
        vout: Some(vec![UTXO {
            txid: "vout-txid-1".to_string(),
            vout: 1,
        }]),
    }
}

fn fixture_of_runes_export_bridge_input(caller: Principal) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: None,
        icp_address: caller,
        btc_address: "tb1qrunesexportreceiver000000000000000000000".to_string(),
        asset_infos: vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::Runes,
            asset_id: "UNCOMMON•GOODS".to_string(),
            amount: 125_000u64.into(),
            decimals: 8,
        }],
        bridge_type: BridgeType::Export,
        deposit_fee_btc_sats: None,
        withdrawal_fee_btc_sats: None,
        withdrawal_fee_icp_e8s: None,
        btc_fee: None,
        created_at_ts: 300,
        ckbtc_block_id: None,
        status: None,
        omnity_ticket_id: None,
        vin: None,
        vout: None,
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
        assert!(
            result.is_ok(),
            "Expected successful bridge transaction retrieval"
        );
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
        assert!(
            result.is_ok(),
            "Expected successful bridge transaction retrieval"
        );
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

#[tokio::test]
async fn it_should_get_runes_import_bridge_transaction_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let created_bridge = token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = token_storage_client
            .user_get_bridge_transaction_by_id(created_bridge.bridge_id.clone())
            .await;

        // Assert
        assert!(result.is_ok());
        let bridge = result.unwrap();
        assert!(bridge.is_some());
        let bridge = bridge.unwrap();
        assert_eq!(bridge.bridge_id, created_bridge.bridge_id);
        assert_eq!(bridge.bridge_type, BridgeType::Import);
        assert_eq!(bridge.asset_infos[0].asset_type, BridgeAssetType::Runes);
        assert_eq!(bridge.omnity_ticket_id, None);
        assert_eq!(
            bridge.vin,
            Some(vec![UTXO {
                txid: "vin-txid-1".to_string(),
                vout: 0,
            }])
        );
        assert_eq!(
            bridge.vout,
            Some(vec![UTXO {
                txid: "vout-txid-1".to_string(),
                vout: 1,
            }])
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_confirmed_runes_import_bridge_transaction_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let mut input = fixture_of_runes_import_bridge_input(caller);
        input.status = Some(BridgeTransactionStatus::Confirmed);
        input.omnity_ticket_id = Some("rune_txid_123".to_string());
        let created_bridge = token_storage_client
            .user_create_bridge_transaction(input)
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = token_storage_client
            .user_get_bridge_transaction_by_id(created_bridge.bridge_id.clone())
            .await;

        // Assert
        assert!(result.is_ok());
        let bridge = result.unwrap().unwrap();
        assert_eq!(bridge.status, BridgeTransactionStatus::Confirmed);
        assert_eq!(bridge.omnity_ticket_id, Some("rune_txid_123".to_string()));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_runes_export_bridge_transaction_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let created_bridge = token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_export_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = token_storage_client
            .user_get_bridge_transaction_by_id(created_bridge.bridge_id.clone())
            .await;

        // Assert
        assert!(result.is_ok());
        let bridge = result.unwrap().unwrap();
        assert_eq!(bridge.bridge_id, created_bridge.bridge_id);
        assert_eq!(bridge.bridge_type, BridgeType::Export);
        assert_eq!(bridge.status, BridgeTransactionStatus::Created);
        assert_eq!(bridge.asset_infos[0].asset_type, BridgeAssetType::Runes);
        assert_eq!(bridge.asset_infos[0].asset_id, "UNCOMMON•GOODS".to_string());
        assert_eq!(bridge.omnity_ticket_id, None);
        assert_eq!(bridge.btc_txid, None);
        assert_eq!(bridge.withdrawal_fee_icp_e8s, None);

        Ok(())
    })
    .await
    .unwrap();
}
