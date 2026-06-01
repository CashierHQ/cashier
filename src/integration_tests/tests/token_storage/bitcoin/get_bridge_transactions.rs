// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType, UTXO,
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
        created_at_ts: 1,
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
async fn it_should_fail_user_get_bridge_transactions_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let input = GetUserBridgeTransactionsInputArg {
            start: None,
            limit: None,
            status: None,
            bridge_type: None,
            asset_type: None,
            rune_id: None,
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
            bridge_type: None,
            asset_type: None,
            rune_id: None,
        };
        let result1 = token_storage_client
            .user_get_bridge_transactions(input1)
            .await;

        let input2 = GetUserBridgeTransactionsInputArg {
            start: Some(2),
            limit: Some(2),
            status: None,
            bridge_type: None,
            asset_type: None,
            rune_id: None,
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
                bridge_type: None,
                asset_type: None,
                rune_id: None,
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
                bridge_type: None,
                asset_type: None,
                rune_id: None,
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

#[tokio::test]
async fn it_should_get_bridge_transactions_filtered_by_bridge_type() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let import_bridge_1 = token_storage_client
            .user_create_bridge_transaction(import_bridge_input(
                caller,
                "txid_import_1".to_string(),
            ))
            .await
            .unwrap()
            .unwrap();
        let import_bridge_2 = token_storage_client
            .user_create_bridge_transaction(import_bridge_input(
                caller,
                "txid_import_2".to_string(),
            ))
            .await
            .unwrap()
            .unwrap();
        let export_bridge_1 = token_storage_client
            .user_create_bridge_transaction(export_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act: filter by Import
        let import_results = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: Some(BridgeType::Import),
                asset_type: None,
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(import_results.len(), 2);
        assert!(
            import_results
                .iter()
                .all(|tx| tx.bridge_type == BridgeType::Import)
        );
        assert!(
            import_results
                .iter()
                .any(|tx| tx.bridge_id == import_bridge_1.bridge_id)
        );
        assert!(
            import_results
                .iter()
                .any(|tx| tx.bridge_id == import_bridge_2.bridge_id)
        );

        // Act: filter by Export
        let export_results = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: Some(BridgeType::Export),
                asset_type: None,
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(export_results.len(), 1);
        assert_eq!(export_results[0].bridge_type, BridgeType::Export);
        assert_eq!(export_results[0].bridge_id, export_bridge_1.bridge_id);

        // Act: no filter returns all
        let all_results = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: None,
                asset_type: None,
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(all_results.len(), 3);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_runes_bridge_transactions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let created = token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let transactions = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: Some(BridgeType::Import),
                asset_type: None,
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].bridge_id, created.bridge_id);
        assert_eq!(
            transactions[0].asset_infos[0].asset_type,
            BridgeAssetType::Runes
        );
        assert_eq!(
            transactions[0].vin,
            Some(vec![UTXO {
                txid: "vin-txid-1".to_string(),
                vout: 0,
            }])
        );
        assert_eq!(
            transactions[0].vout,
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
async fn it_should_get_confirmed_runes_bridge_transactions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let mut input = fixture_of_runes_import_bridge_input(caller);
        input.status = Some(BridgeTransactionStatus::Confirmed);
        input.omnity_ticket_id = Some("rune_txid_123".to_string());
        let created = token_storage_client
            .user_create_bridge_transaction(input)
            .await
            .unwrap()
            .unwrap();

        // Act
        let transactions = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: Some(BridgeTransactionStatus::Confirmed),
                bridge_type: Some(BridgeType::Import),
                asset_type: None,
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].bridge_id, created.bridge_id);
        assert_eq!(transactions[0].status, BridgeTransactionStatus::Confirmed);
        assert_eq!(
            transactions[0].omnity_ticket_id,
            Some("rune_txid_123".to_string())
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_runes_export_bridge_transactions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let created = token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_export_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let transactions = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: Some(BridgeType::Export),
                asset_type: None,
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].bridge_id, created.bridge_id);
        assert_eq!(transactions[0].bridge_type, BridgeType::Export);
        assert_eq!(
            transactions[0].asset_infos[0].asset_type,
            BridgeAssetType::Runes
        );
        assert_eq!(transactions[0].status, BridgeTransactionStatus::Created);
        assert_eq!(transactions[0].omnity_ticket_id, None);

        Ok(())
    })
    .await
    .unwrap();
}

fn fixture_of_second_runes_import_bridge_input(
    caller: Principal,
) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: Some("rune_txid_456".to_string()),
        icp_address: caller,
        btc_address: "tb1qrunereceiver0000000000000000000000001".to_string(),
        asset_infos: vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::Runes,
            asset_id: "DOG•GO•TO•THE•MOON".to_string(),
            amount: 10_000u64.into(),
            decimals: 8,
        }],
        bridge_type: BridgeType::Import,
        deposit_fee_btc_sats: Some(1_000u64.into()),
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
async fn it_should_get_bridge_transactions_filtered_by_asset_type_btc() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        // Export bridge has asset_type: BTC; import bridge has empty asset_infos
        let btc_export = token_storage_client
            .user_create_bridge_transaction(export_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();
        token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let transactions = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: None,
                asset_type: Some(BridgeAssetType::BTC),
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].bridge_id, btc_export.bridge_id);
        assert_eq!(
            transactions[0].asset_infos[0].asset_type,
            BridgeAssetType::BTC
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_bridge_transactions_filtered_by_asset_type_runes() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        token_storage_client
            .user_create_bridge_transaction(import_bridge_input(caller, "btc_txid_0".to_string()))
            .await
            .unwrap()
            .unwrap();
        let rune_created = token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let transactions = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: None,
                asset_type: Some(BridgeAssetType::Runes),
                rune_id: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].bridge_id, rune_created.bridge_id);
        assert_eq!(
            transactions[0].asset_infos[0].asset_type,
            BridgeAssetType::Runes
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_bridge_transactions_filtered_by_rune_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let first_rune = token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();
        token_storage_client
            .user_create_bridge_transaction(fixture_of_second_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let transactions = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: None,
                asset_type: None,
                rune_id: Some("UNCOMMON•GOODS".to_string()),
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].bridge_id, first_rune.bridge_id);
        assert_eq!(transactions[0].asset_infos[0].asset_id, "UNCOMMON•GOODS");

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_no_bridge_transactions_when_rune_id_does_not_match() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();

        // Act
        let transactions = token_storage_client
            .user_get_bridge_transactions(GetUserBridgeTransactionsInputArg {
                start: Some(0),
                limit: Some(10),
                status: None,
                bridge_type: None,
                asset_type: None,
                rune_id: Some("NONEXISTENT•RUNE".to_string()),
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(transactions.len(), 0);

        Ok(())
    })
    .await
    .unwrap();
}
