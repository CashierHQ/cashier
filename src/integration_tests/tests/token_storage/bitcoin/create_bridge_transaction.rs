// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_common::test_utils::random_principal_id;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType, UTXO,
    },
    dto::bitcoin::CreateBridgeTransactionInputArg,
    error::CanisterError,
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
async fn it_should_fail_create_import_bridge_transaction_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let input = import_bridge_input(random_principal_id());

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
async fn it_should_fail_create_export_bridge_transaction_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let input = export_bridge_input(random_principal_id());

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
async fn it_should_fail_create_export_bridge_transaction_due_to_initial_btc_txid() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let mut input = export_bridge_input(caller);
        input.btc_txid = Some("unexpected-txid".to_string());

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected canister call to succeed with inner error"
        );
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
async fn it_should_create_import_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = import_bridge_input(caller);

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
        assert_eq!(bridge_transaction.status, BridgeTransactionStatus::Pending);
        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_export_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = export_bridge_input(caller);

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected successful export bridge transaction creation"
        );
        let bridge_transaction_result = result.unwrap();
        assert!(bridge_transaction_result.is_ok());
        let bridge_transaction = bridge_transaction_result.unwrap();
        assert_eq!(bridge_transaction.icp_address, caller);
        assert_eq!(bridge_transaction.bridge_type, BridgeType::Export);
        assert_eq!(bridge_transaction.btc_txid, None);
        assert_eq!(bridge_transaction.block_id, None);
        assert_eq!(
            bridge_transaction.withdrawal_fee_btc_sats,
            Some(450u64.into())
        );
        assert_eq!(bridge_transaction.btc_fee, Some(1200u64.into()));
        assert_eq!(bridge_transaction.status, BridgeTransactionStatus::Created);
        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_create_import_bridge_without_btc_txid_or_ckbtc_block_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
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
        };

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected canister call to succeed with inner error"
        );
        let bridge_result = result.unwrap();
        assert!(bridge_result.is_err());
        assert!(matches!(
            bridge_result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_txid or ckbtc_block_id is required for import"
        ));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_import_bridge_with_ckbtc_block_id_and_completed_status() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let ckbtc_block_id = 42u64;
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: caller,
            btc_address: "tb1qexampleaddress0000000000000000000000000".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "UTXO".to_string(),
                amount: Nat::from(50_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: Some(Nat::from(1000u64)),
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: Some(ckbtc_block_id),
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
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
        let bridge_result = result.unwrap();
        assert!(bridge_result.is_ok());
        let bridge = bridge_result.unwrap();
        assert_eq!(bridge.bridge_type, BridgeType::Import);
        assert_eq!(bridge.btc_txid, None);
        assert_eq!(bridge.ckbtc_block_id, Some(ckbtc_block_id));
        assert_eq!(bridge.status, BridgeTransactionStatus::Completed);
        assert_eq!(bridge.bridge_id, format!("import_ckbtc_{}", ckbtc_block_id));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_confirmed_runes_import_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let mut input = fixture_of_runes_import_bridge_input(caller);
        input.status = Some(BridgeTransactionStatus::Confirmed);
        input.omnity_ticket_id = Some("rune_txid_123".to_string());

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
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
async fn it_should_fail_create_runes_import_bridge_transaction_due_to_duplicate_btc_txid() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = fixture_of_runes_import_bridge_input(caller);
        token_storage_client
            .user_create_bridge_transaction(input.clone())
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Assert
        assert!(result.is_ok());
        let bridge_result = result.unwrap();
        assert!(bridge_result.is_err());
        assert!(matches!(
            bridge_result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "A bridge transaction with the same btc_txid already exists"
        ));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_runes_import_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = fixture_of_runes_import_bridge_input(caller);

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Assert
        assert!(result.is_ok());
        let bridge_result = result.unwrap();
        assert!(bridge_result.is_ok());
        let bridge = bridge_result.unwrap();
        assert_eq!(bridge.icp_address, caller);
        assert_eq!(bridge.bridge_type, BridgeType::Import);
        assert_eq!(bridge.btc_txid, Some("rune_txid_123".to_string()));
        assert_eq!(bridge.status, BridgeTransactionStatus::Pending);
        assert_eq!(bridge.asset_infos.len(), 1);
        assert_eq!(bridge.asset_infos[0].asset_type, BridgeAssetType::Runes);
        assert_eq!(bridge.asset_infos[0].amount, Nat::from(49_000u64));
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
async fn it_should_create_runes_export_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = fixture_of_runes_export_bridge_input(caller);

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;

        // Assert
        assert!(result.is_ok());
        let bridge = result.unwrap().unwrap();
        assert_eq!(bridge.icp_address, caller);
        assert_eq!(bridge.bridge_type, BridgeType::Export);
        assert_eq!(bridge.status, BridgeTransactionStatus::Created);
        assert_eq!(bridge.btc_txid, None);
        assert_eq!(bridge.omnity_ticket_id, None);
        assert_eq!(bridge.asset_infos.len(), 1);
        assert_eq!(bridge.asset_infos[0].asset_type, BridgeAssetType::Runes);
        assert_eq!(bridge.asset_infos[0].asset_id, "UNCOMMON•GOODS".to_string());
        assert_eq!(bridge.withdrawal_fee_icp_e8s, None);
        assert_eq!(bridge.btc_fee, None);

        Ok(())
    })
    .await
    .unwrap();
}
