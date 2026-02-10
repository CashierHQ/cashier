// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v3::send_tip::fixture::TipLinkV3Fixture;
use crate::{
    constant::{CK_BTC_PRINCIPAL, ICP_PRINCIPAL},
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    constant,
    repository::link::v1::LinkType,
    repository::{
        action::v1::ActionType,
        asset::v1::Asset,
        common::Wallet,
        intent::v1::{IntentTask, IntentType},
        transaction::v1::{IcTransaction, Protocol},
    },
};
use cashier_common::{constant::CREATE_LINK_FEE, test_utils};
use cashier_shared::types::{AddressType as AddressTypeShared, LinkType as LinkTypeShared};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;
use std::{collections::HashMap, sync::Arc};
use transaction_manager::utils::calculator::calculate_icrc2_transfer_intent_amount;

#[tokio::test]
async fn it_should_error_create_icp_token_tip_linkv2_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let be_client = ctx.new_cashier_backend_client(Principal::anonymous());

        let caller = TestUser::User1.get_principal();
        let token = constant::ICP_TOKEN;
        let amount = Nat::from(1_000_000u64);
        let test_fixture =
            TipLinkV3Fixture::new(Arc::new(ctx.clone()), caller, token, amount.clone()).await;
        let input = test_fixture.tip_link_input().unwrap();

        // Act
        let result = be_client.user_create_link_v3(input).await;
        // Assert
        assert!(result.is_err());
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
async fn it_should_create_icp_token_tip_link_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = constant::ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let mut test_fixture =
            TipLinkV3Fixture::new(Arc::new(ctx.clone()), caller, token, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let initial_balance = Nat::from(1_000_000_000u64);
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        // Act
        test_fixture
            .link_fixture
            .airdrop_icp(initial_balance.clone(), &caller)
            .await;

        // Assert
        let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            caller_balance_before, initial_balance,
            "Caller ICP balance does not match"
        );

        // Act
        let create_link_result = test_fixture.create_link().await;

        // Assert
        let link = create_link_result.link;
        let action = create_link_result.action;

        assert!(!link.id.is_empty());
        assert_eq!(link.link_type, LinkTypeShared::SendTip);
        assert_eq!(action.intents.len(), 2);

        // Assert Fee Intent
        let fee_intent = action
            .intents
            .iter()
            .find(|intent| {
                intent.source_address_type == AddressTypeShared::Creator
                    && intent.dest_address_type == AddressTypeShared::Treasury
            })
            .expect("TransferWalletToLink intent not found");

        assert_eq!(
            fee_intent.asset.address,
            Principal::from_text(ICP_PRINCIPAL).unwrap()
        );

        // Asset Asset Intent
        let asset_intent = action
            .intents
            .iter()
            .find(|intent| {
                intent.source_address_type == AddressTypeShared::Creator
                    && intent.dest_address_type == AddressTypeShared::Link
            })
            .expect("TransferWalletToTreasury intent not found");

        assert_eq!(
            asset_intent.asset.address,
            Principal::from_text(ICP_PRINCIPAL).unwrap()
        );
        assert_eq!(asset_intent.amount, tip_amount);

        // Assert ICRC-112 requests
        assert!(create_link_result.icrc112_requests.is_some());
        let icrc112_requests = create_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1);
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                }
                _ => panic!("Unexpected method in ICRC-112 request"),
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_icrc_token_tip_link_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = constant::CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let mut test_fixture =
            TipLinkV3Fixture::new(Arc::new(ctx.clone()), caller, token, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);

        let icp_initial_balance = Nat::from(1_000_000u64);
        let ckbtc_initial_balance = Nat::from(1_000_000_000u64);
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };

        // Act
        test_fixture
            .link_fixture
            .airdrop_icp(icp_initial_balance.clone(), &caller)
            .await;
        test_fixture
            .link_fixture
            .airdrop_icrc(
                constant::CKBTC_ICRC_TOKEN,
                ckbtc_initial_balance.clone(),
                &caller,
            )
            .await;

        // Assert
        let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(icp_balance_before, icp_initial_balance);
        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(ckbtc_balance_before, ckbtc_initial_balance);

        // Act
        let create_link_result = test_fixture.create_link().await;

        // Assert
        let link = create_link_result.link;
        let action = create_link_result.action;

        assert!(!link.id.is_empty());
        assert_eq!(link.link_type, LinkTypeShared::SendTip);

        // Assert Fee Intent
        let fee_intent = action
            .intents
            .iter()
            .find(|intent| {
                intent.source_address_type == AddressTypeShared::Creator
                    && intent.dest_address_type == AddressTypeShared::Treasury
            })
            .expect("TransferWalletToLink intent not found");

        assert_eq!(
            fee_intent.asset.address,
            Principal::from_text(ICP_PRINCIPAL).unwrap()
        );

        // Asset Asset Intent
        let asset_intent = action
            .intents
            .iter()
            .find(|intent| {
                intent.source_address_type == AddressTypeShared::Creator
                    && intent.dest_address_type == AddressTypeShared::Link
            })
            .expect("TransferWalletToTreasury intent not found");

        assert_eq!(
            asset_intent.asset.address,
            Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
        );
        assert_eq!(asset_intent.amount, tip_amount);

        // Assert ICRC-112 requests
        assert!(create_link_result.icrc112_requests.is_some());
        let icrc112_requests = create_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2);
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert!(
                        req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
                            || req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
                    );
                }
                _ => panic!("Unexpected method in ICRC-112 request"),
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}
