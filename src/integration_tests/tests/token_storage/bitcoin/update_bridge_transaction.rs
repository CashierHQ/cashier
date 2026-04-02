// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_common::test_utils::random_id_string;
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    bitcoin::bridge_transaction::{
        BlockConfirmation, BridgeAssetInfo, BridgeAssetType, BridgeTransactionStatus, BridgeType,
        UTXO,
    },
    dto::bitcoin::{CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg},
    error::CanisterError,
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

fn fixture_of_import_bridge_input(caller: Principal) -> CreateBridgeTransactionInputArg {
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
        ckbtc_block_id: None,
        status: None,
        omnity_ticket_id: None,
        vin: None,
        vout: None,
    }
}

fn fixture_of_export_bridge_input(caller: Principal) -> CreateBridgeTransactionInputArg {
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
        btc_fee: Some(Nat::from(1200u64)),
        created_at_ts: 100,
        ckbtc_block_id: None,
        status: None,
        omnity_ticket_id: None,
        vin: None,
        vout: None,
    }
}

fn fixture_of_block_confirmations() -> Vec<BlockConfirmation> {
    vec![
        BlockConfirmation {
            block_id: 1,
            block_timestamp: 1620000000,
        },
        BlockConfirmation {
            block_id: 2,
            block_timestamp: 1620000600,
        },
    ]
}

fn fixture_of_runes_import_bridge_input(caller: Principal) -> CreateBridgeTransactionInputArg {
    CreateBridgeTransactionInputArg {
        btc_txid: Some("rune_txid_123".to_string()),
        icp_address: caller,
        btc_address: "tb1qrunereceiver0000000000000000000000000".to_string(),
        asset_infos: vec![BridgeAssetInfo {
            asset_type: BridgeAssetType::Runes,
            asset_id: "UNCOMMON•GOODS".to_string(),
            amount: Nat::from(50_000u64),
            decimals: 8,
        }],
        bridge_type: BridgeType::Import,
        deposit_fee: Some(Nat::from(1_000u64)),
        withdrawal_fee: None,
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

#[tokio::test]
async fn it_should_fail_update_bridge_transaction_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let block_confirmations = fixture_of_block_confirmations();
        let input = UpdateBridgeTransactionInputArg {
            bridge_id: random_id_string(),
            btc_txid: Some("exampletxid0000000000000000000000000000000000".to_string()),
            ckbtc_block_id: None,
            block_id: Some(100u64),
            block_timestamp: Some(1620001200u64),
            block_confirmations: Some(block_confirmations),
            deposit_fee: Some(Nat::from(1000u32)),
            withdrawal_fee: Some(Nat::from(500u32)),
            btc_fee: Some(Nat::from(200u32)),
            retry_times: Some(1),
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
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
async fn it_should_fail_update_bridge_transaction_due_to_missing_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = UpdateBridgeTransactionInputArg {
            bridge_id: random_id_string(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: Some(200u64),
            block_timestamp: Some(1620001200u64),
            block_confirmations: Some(fixture_of_block_confirmations()),
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = token_storage_client
            .user_update_bridge_transaction(input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected canister call to succeed with inner error"
        );
        let update_result = result.unwrap();
        assert!(update_result.is_err());
        assert!(matches!(
            update_result.unwrap_err(),
            CanisterError::NotFound(message)
                if message.contains("Bridge transaction with id")
                    && message.contains("not found")
        ));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_update_import_bridge_transaction_due_to_existing_block_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let create_input = fixture_of_import_bridge_input(caller);

        let create_result = token_storage_client
            .user_create_bridge_transaction(create_input)
            .await;
        let created_bridge = create_result.unwrap().unwrap();

        let initial_update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: Some(200u64),
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        let _initial_update_result = token_storage_client
            .user_update_bridge_transaction(initial_update_input)
            .await
            .unwrap()
            .unwrap();

        let invalid_update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id,
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: Some(201u64),
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = token_storage_client
            .user_update_bridge_transaction(invalid_update_input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected canister call to succeed with inner error"
        );
        let update_result = result.unwrap();
        assert!(update_result.is_err());
        assert!(matches!(
            update_result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "block_id is already set and cannot be updated"
        ));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_update_import_bridge_transaction_due_to_non_increasing_retry_times() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let create_input = fixture_of_import_bridge_input(caller);

        let create_result = token_storage_client
            .user_create_bridge_transaction(create_input)
            .await;
        let created_bridge = create_result.unwrap().unwrap();

        let initial_update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: Some(1),
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        let _initial_update_result = token_storage_client
            .user_update_bridge_transaction(initial_update_input)
            .await
            .unwrap()
            .unwrap();

        let invalid_update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id,
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: Some(1),
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = token_storage_client
            .user_update_bridge_transaction(invalid_update_input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected canister call to succeed with inner error"
        );
        let update_result = result.unwrap();
        assert!(update_result.is_err());
        assert!(matches!(
            update_result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "retry_times can only be increased"
        ));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_update_export_bridge_transaction_due_to_existing_ckbtc_block_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let create_input = fixture_of_export_bridge_input(caller);

        let create_result = token_storage_client
            .user_create_bridge_transaction(create_input)
            .await;
        let created_bridge = create_result.unwrap().unwrap();

        let initial_update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: Some(42u64),
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Pending),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        let _initial_update_result = token_storage_client
            .user_update_bridge_transaction(initial_update_input)
            .await
            .unwrap()
            .unwrap();

        let invalid_update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id,
            btc_txid: None,
            ckbtc_block_id: Some(43u64),
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = token_storage_client
            .user_update_bridge_transaction(invalid_update_input)
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "Expected canister call to succeed with inner error"
        );
        let update_result = result.unwrap();
        assert!(update_result.is_err());
        assert!(matches!(
            update_result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "ckbtc_block_id is already set and cannot be updated"
        ));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_update_import_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = fixture_of_import_bridge_input(caller);

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;
        let created_bridge = result.unwrap().unwrap();

        // Arrange
        let block_confirmations = fixture_of_block_confirmations();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id,
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: Some(200u64),
            block_timestamp: Some(1620001200u64),
            block_confirmations: Some(block_confirmations),
            deposit_fee: Some(Nat::from(1500u32)),
            withdrawal_fee: Some(Nat::from(700u32)),
            btc_fee: Some(Nat::from(300u32)),
            retry_times: Some(2),
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
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
        assert_eq!(updated_transaction.btc_txid, created_bridge.btc_txid);
        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_update_export_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let input = fixture_of_export_bridge_input(caller);

        // Act
        let result = token_storage_client
            .user_create_bridge_transaction(input)
            .await;
        let created_bridge = result.unwrap().unwrap();

        // Assert
        assert_eq!(created_bridge.status, BridgeTransactionStatus::Created);

        // Act
        let update_pending_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: Some(42u64),
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Pending),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        let pending_result = token_storage_client
            .user_update_bridge_transaction(update_pending_input)
            .await;

        // Assert
        assert!(pending_result.is_ok());
        let pending_transaction = pending_result.unwrap().unwrap();
        assert_eq!(pending_transaction.status, BridgeTransactionStatus::Pending);
        assert_eq!(pending_transaction.ckbtc_block_id, Some(42u64));
        assert_eq!(pending_transaction.block_id, None);
        assert_eq!(pending_transaction.btc_txid, None);

        // Act
        let update_complete_input = UpdateBridgeTransactionInputArg {
            bridge_id: pending_transaction.bridge_id,
            btc_txid: Some("btc-export-txid-1".to_string()),
            ckbtc_block_id: None,
            block_id: Some(840_000u64),
            block_timestamp: Some(1_720_000_000u64),
            block_confirmations: Some(vec![BlockConfirmation {
                block_id: 840_000u64,
                block_timestamp: 1_720_000_000u64,
            }]),
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        let complete_result = token_storage_client
            .user_update_bridge_transaction(update_complete_input)
            .await;

        // Assert
        assert!(complete_result.is_ok());
        let complete_transaction = complete_result.unwrap().unwrap();
        assert_eq!(
            complete_transaction.status,
            BridgeTransactionStatus::Completed
        );
        assert_eq!(
            complete_transaction.btc_txid,
            Some("btc-export-txid-1".to_string())
        );
        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_update_runes_import_bridge_transaction() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let created_bridge = token_storage_client
            .user_create_bridge_transaction(fixture_of_runes_import_bridge_input(caller))
            .await
            .unwrap()
            .unwrap();
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: created_bridge.bridge_id.clone(),
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            retry_times: None,
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: Some("omnity-ticket-1".to_string()),
            vin: Some(vec![UTXO {
                txid: "updated-vin-txid".to_string(),
                vout: 2,
            }]),
            vout: Some(vec![UTXO {
                txid: "updated-vout-txid".to_string(),
                vout: 3,
            }]),
        };

        // Act
        let result = token_storage_client
            .user_update_bridge_transaction(update_input)
            .await;

        // Assert
        assert!(result.is_ok());
        let updated = result.unwrap().unwrap();
        assert_eq!(updated.bridge_id, created_bridge.bridge_id);
        assert_eq!(updated.status, BridgeTransactionStatus::Completed);
        assert_eq!(
            updated.omnity_ticket_id,
            Some("omnity-ticket-1".to_string())
        );
        assert_eq!(
            updated.vin,
            Some(vec![UTXO {
                txid: "updated-vin-txid".to_string(),
                vout: 2,
            }])
        );
        assert_eq!(
            updated.vout,
            Some(vec![UTXO {
                txid: "updated-vout-txid".to_string(),
                vout: 3,
            }])
        );

        Ok(())
    })
    .await
    .unwrap();
}
