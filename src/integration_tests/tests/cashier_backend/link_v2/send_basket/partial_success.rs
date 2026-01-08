// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Integration tests for partial success scenarios in multi-token basket links.
//!
//! These tests verify that `amount_available` is correctly updated per-asset
//! when some transactions succeed and others fail.

use crate::cashier_backend::link_v2::fixture::LinkTestFixtureV2;
use crate::cashier_backend::link_v2::send_basket::fixture::BasketLinkV2Fixture;
use crate::utils::principal::TestUser;
use crate::utils::token_drain::drain_link_token_balance;
use crate::utils::{icrc_112, with_pocket_ic_context};
use candid::Nat;
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::common::Asset;
use cashier_backend_types::repository::link::v1::LinkState;
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

/// Test partial activation: deposit only ICP, skip CKBTC.
/// Verifies that only ICP's amount_available is set, CKBTC remains 0.
#[tokio::test]
async fn it_should_partial_activate_multi_token_basket_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: create basket with ICP + CKBTC
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string(), CKBTC_ICRC_TOKEN.to_string()];
        let icp_amount = Nat::from(1_000_000u64);
        let ckbtc_amount = Nat::from(500_000u64);
        let amounts = vec![icp_amount.clone(), ckbtc_amount.clone()];

        let mut fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;

        // Airdrop tokens to creator
        fixture.airdrop_icp_and_asset().await;

        // Create link
        let create_link_result = fixture.create_link().await;
        // Note: activate_link_v2 expects action_id, not link_id (confusing API)
        let action_id = create_link_result.action.id.clone();

        // Get CKBTC ledger principal to skip
        let ckbtc_ledger = ctx.get_icrc_token_principal(CKBTC_ICRC_TOKEN).unwrap();

        // Act: Execute ICRC112 requests, but SKIP CKBTC transfers
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let _icrc112_result = icrc_112::execute_icrc112_selective(
            &icrc_112_requests,
            creator,
            &fixture.link_fixture.ctx,
            &[ckbtc_ledger], // Skip CKBTC ledger
        )
        .await;

        // Activate link (should now handle partial deposits)
        let activate_result = fixture.link_fixture.activate_link_v2(&action_id).await;

        // Assert: activation succeeds (with partial success)
        assert!(
            activate_result.is_ok(),
            "Activation should succeed: {:?}",
            activate_result
        );
        let activate_result = activate_result.unwrap();

        // Verify asset_info: ICP should have amount, CKBTC should be 0
        let link_dto = activate_result.link;
        assert_eq!(link_dto.asset_info.len(), 2);

        // Find ICP asset
        let icp_asset = link_dto
            .asset_info
            .iter()
            .find(|a| match &a.asset {
                cashier_backend_types::repository::common::Asset::IC { address } => {
                    *address == ctx.icp_ledger_principal
                }
            })
            .expect("ICP asset should exist");

        // Find CKBTC asset
        let ckbtc_asset = link_dto
            .asset_info
            .iter()
            .find(|a| match &a.asset {
                cashier_backend_types::repository::common::Asset::IC { address } => {
                    *address == ckbtc_ledger
                }
            })
            .expect("CKBTC asset should exist");

        // ICP should have amount_available (minus fee)
        assert!(
            icp_asset.amount_available > 0u64,
            "ICP amount_available should be > 0, got {}",
            icp_asset.amount_available
        );

        // CKBTC should have 0 amount_available (not deposited)
        assert_eq!(
            ckbtc_asset.amount_available,
            Nat::from(0u64),
            "CKBTC amount_available should be 0"
        );

        // Action state should be Fail (partial success = overall failure)
        let action_dto = activate_result.action;
        assert_eq!(
            action_dto.state,
            ActionState::Fail,
            "Action state should be Fail for partial success"
        );

        // Link state should remain CreateLink (not Active) since not all succeeded
        assert_eq!(
            link_dto.state,
            LinkState::CreateLink,
            "Link should remain CreateLink on partial success"
        );

        Ok(())
    })
    .await
    .unwrap();
}

/// Test multi-token receive: activate fully, then claim all tokens.
/// This verifies normal multi-token receive works correctly.
#[tokio::test]
async fn it_should_receive_multi_token_basket_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: create basket with ICP + CKBTC
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string(), CKBTC_ICRC_TOKEN.to_string()];
        let icp_amount = Nat::from(1_000_000u64);
        let ckbtc_amount = Nat::from(500_000u64);
        let amounts = vec![icp_amount.clone(), ckbtc_amount.clone()];

        let mut fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;

        // Airdrop tokens to creator
        fixture.airdrop_icp_and_asset().await;

        // Create link
        let create_link_result = fixture.create_link().await;
        // Note: activate_link_v2 expects action_id, not link_id
        let action_id = create_link_result.action.id.clone();
        let link_id = create_link_result.link.id.clone();

        // Get CKBTC ledger principal
        let ckbtc_ledger = ctx.get_icrc_token_principal(CKBTC_ICRC_TOKEN).unwrap();

        // Execute ALL ICRC112 requests (full deposit)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let _icrc112_result = icrc_112::execute_icrc112_request(
            &icrc_112_requests,
            creator,
            &fixture.link_fixture.ctx,
        )
        .await;

        // Activate link normally
        let activate_result = fixture.link_fixture.activate_link_v2(&action_id).await;
        assert!(activate_result.is_ok(), "Normal activation should succeed");
        let activate_result = activate_result.unwrap();
        assert_eq!(
            activate_result.link.state,
            LinkState::Active,
            "Link should be Active"
        );

        // Verify the initial state
        let link_dto = activate_result.link.clone();
        let icp_asset = link_dto
            .asset_info
            .iter()
            .find(|a| match &a.asset {
                cashier_backend_types::repository::common::Asset::IC { address } => {
                    *address == ctx.icp_ledger_principal
                }
            })
            .unwrap();
        let ckbtc_asset = link_dto
            .asset_info
            .iter()
            .find(|a| match &a.asset {
                cashier_backend_types::repository::common::Asset::IC { address } => {
                    *address == ckbtc_ledger
                }
            })
            .unwrap();

        // Both should have non-zero amounts after full activation
        assert!(icp_asset.amount_available > 0u64, "ICP should be deposited");
        assert!(
            ckbtc_asset.amount_available > 0u64,
            "CKBTC should be deposited"
        );

        // Create receiver and claim
        let receiver = TestUser::User2.get_principal();
        let receiver_fixture =
            LinkTestFixtureV2::new(fixture.link_fixture.ctx.clone(), receiver).await;

        // Create RECEIVE action
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
        };
        let create_action_result = receiver_fixture.create_action_v2(create_action_input).await;
        assert!(
            create_action_result.is_ok(),
            "Create receive action should succeed"
        );
        let action = create_action_result.unwrap();

        // Process RECEIVE action
        let process_action_input = ProcessActionV2Input {
            action_id: action.id.clone(),
        };
        let process_result = receiver_fixture
            .process_action_v2(process_action_input)
            .await;

        // Assert: both tokens should transfer successfully
        assert!(
            process_result.is_ok(),
            "Process receive should succeed with full deposits"
        );
        let process_result = process_result.unwrap();

        // Both amounts should be 0 after successful receive
        for asset in &process_result.link.asset_info {
            assert_eq!(
                asset.amount_available,
                Nat::from(0u64),
                "All amounts should be 0 after successful receive"
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

/// Test partial receive: ICP transfer succeeds, CKBTC fails (drained balance)
/// Verifies amount_available decremented only for ICP
#[tokio::test]
async fn it_should_partial_receive_multi_token_basket_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: create & activate basket with ICP + CKBTC
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string(), CKBTC_ICRC_TOKEN.to_string()];
        let icp_amount = Nat::from(1_000_000u64);
        let ckbtc_amount = Nat::from(500_000u64);
        let amounts = vec![icp_amount.clone(), ckbtc_amount.clone()];

        let mut fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;
        fixture.airdrop_icp_and_asset().await;

        // Create and activate link fully
        let create_result = fixture.create_link().await;
        let action_id = create_result.action.id.clone();
        let link_id = create_result.link.id.clone();

        let icrc_112_requests = create_result.action.icrc_112_requests.unwrap();
        let _ = icrc_112::execute_icrc112_request(
            &icrc_112_requests,
            creator,
            &fixture.link_fixture.ctx,
        )
        .await;

        let activate_result = fixture.link_fixture.activate_link_v2(&action_id).await;
        assert!(activate_result.is_ok(), "Activation should succeed");
        let activate_result = activate_result.unwrap();
        assert_eq!(activate_result.link.state, LinkState::Active);

        // Record initial amounts
        let ckbtc_ledger = ctx.get_icrc_token_principal(CKBTC_ICRC_TOKEN).unwrap();
        let initial_ckbtc_available = activate_result
            .link
            .asset_info
            .iter()
            .find(|a| matches!(&a.asset, Asset::IC { address } if *address == ckbtc_ledger))
            .unwrap()
            .amount_available
            .clone();

        // Drain CKBTC from link account to simulate insufficient balance
        drain_link_token_balance(ctx, &link_id, CKBTC_ICRC_TOKEN).await;

        // Act: create & process RECEIVE action
        let receiver = TestUser::User2.get_principal();
        let receiver_fixture =
            LinkTestFixtureV2::new(fixture.link_fixture.ctx.clone(), receiver).await;

        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
        };
        let action = receiver_fixture
            .create_action_v2(create_action_input)
            .await
            .unwrap();

        let process_input = ProcessActionV2Input {
            action_id: action.id.clone(),
        };
        let process_result = receiver_fixture.process_action_v2(process_input).await;

        // Assert: process succeeds (partial success handled internally)
        assert!(process_result.is_ok());
        let result = process_result.unwrap();

        // Action state should be Fail (partial = overall failure)
        assert_eq!(
            result.action.state,
            ActionState::Fail,
            "Action state should be Fail for partial receive"
        );

        // Link should remain Active (not InactiveEnded)
        assert_eq!(
            result.link.state,
            LinkState::Active,
            "Link should remain Active on partial receive"
        );

        // ICP amount_available should be 0 (transfer succeeded)
        let icp_asset = result
            .link
            .asset_info
            .iter()
            .find(|a| matches!(&a.asset, Asset::IC { address } if *address == ctx.icp_ledger_principal))
            .unwrap();
        assert_eq!(
            icp_asset.amount_available,
            Nat::from(0u64),
            "ICP amount_available should be 0 after successful transfer"
        );

        // CKBTC amount_available should be unchanged (transfer failed)
        let ckbtc_asset = result
            .link
            .asset_info
            .iter()
            .find(|a| matches!(&a.asset, Asset::IC { address } if *address == ckbtc_ledger))
            .unwrap();
        assert_eq!(
            ckbtc_asset.amount_available, initial_ckbtc_available,
            "CKBTC amount_available should be unchanged after failed transfer"
        );

        // Verify receiver balance changes
        let receiver_account = Account {
            owner: receiver,
            subaccount: None,
        };
        let icp_client = ctx.new_icp_ledger_client(receiver);
        let receiver_icp_balance = icp_client.balance_of(&receiver_account).await.unwrap();
        assert!(
            receiver_icp_balance > 0u64,
            "Receiver should have received ICP"
        );

        let ckbtc_receiver_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, receiver);
        let receiver_ckbtc_balance = ckbtc_receiver_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        assert_eq!(
            receiver_ckbtc_balance,
            Nat::from(0u64),
            "Receiver should NOT have received CKBTC"
        );

        Ok(())
    })
    .await
    .unwrap();
}

/// Test partial withdraw: ICP transfer succeeds, CKBTC fails (drained balance)
/// Verifies amount_available decremented only for ICP
#[tokio::test]
async fn it_should_partial_withdraw_multi_token_basket_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: create & activate basket with ICP + CKBTC
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string(), CKBTC_ICRC_TOKEN.to_string()];
        let icp_amount = Nat::from(1_000_000u64);
        let ckbtc_amount = Nat::from(500_000u64);
        let amounts = vec![icp_amount.clone(), ckbtc_amount.clone()];

        let mut fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;
        fixture.airdrop_icp_and_asset().await;

        // Create and activate link fully
        let create_result = fixture.create_link().await;
        let action_id = create_result.action.id.clone();
        let link_id = create_result.link.id.clone();

        let icrc_112_requests = create_result.action.icrc_112_requests.unwrap();
        let _ = icrc_112::execute_icrc112_request(
            &icrc_112_requests,
            creator,
            &fixture.link_fixture.ctx,
        )
        .await;

        let activate_result = fixture.link_fixture.activate_link_v2(&action_id).await;
        assert!(activate_result.is_ok(), "Activation should succeed");
        let activate_result = activate_result.unwrap();
        assert_eq!(activate_result.link.state, LinkState::Active);

        // Record initial amounts and creator balance before withdraw
        let ckbtc_ledger = ctx.get_icrc_token_principal(CKBTC_ICRC_TOKEN).unwrap();
        let initial_ckbtc_available = activate_result
            .link
            .asset_info
            .iter()
            .find(|a| matches!(&a.asset, Asset::IC { address } if *address == ckbtc_ledger))
            .unwrap()
            .amount_available
            .clone();

        let creator_account = Account {
            owner: creator,
            subaccount: None,
        };
        let icp_client = ctx.new_icp_ledger_client(creator);
        let creator_icp_before = icp_client.balance_of(&creator_account).await.unwrap();
        let ckbtc_creator_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let creator_ckbtc_before = ckbtc_creator_client
            .balance_of(&creator_account)
            .await
            .unwrap();

        // Disable link first (required for withdraw)
        let disable_result = fixture.link_fixture.disable_link_v2(&link_id).await;
        assert!(disable_result.is_ok());
        assert_eq!(disable_result.unwrap().state, LinkState::Inactive);

        // Drain CKBTC from link account to simulate insufficient balance
        drain_link_token_balance(ctx, &link_id, CKBTC_ICRC_TOKEN).await;

        // Act: create & process WITHDRAW action (as creator)
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Withdraw,
        };
        let action = fixture
            .link_fixture
            .create_action_v2(create_action_input)
            .await
            .unwrap();

        let process_input = ProcessActionV2Input {
            action_id: action.id.clone(),
        };
        let process_result = fixture.link_fixture.process_action_v2(process_input).await;

        // Assert: process succeeds (partial success handled internally)
        assert!(process_result.is_ok());
        let result = process_result.unwrap();

        // Action state should be Fail (partial = overall failure)
        assert_eq!(
            result.action.state,
            ActionState::Fail,
            "Action state should be Fail for partial withdraw"
        );

        // Link should remain Inactive (not InactiveEnded)
        assert_eq!(
            result.link.state,
            LinkState::Inactive,
            "Link should remain Inactive on partial withdraw"
        );

        // ICP amount_available should be ~0 (transfer succeeded, fee may remain)
        // ICP fee is 10000, so that amount may remain due to fee mechanics
        let icp_asset = result
            .link
            .asset_info
            .iter()
            .find(|a| matches!(&a.asset, Asset::IC { address } if *address == ctx.icp_ledger_principal))
            .unwrap();
        assert!(
            icp_asset.amount_available <= 10000u64,
            "ICP amount_available should be 0 or fee after successful withdraw, got {}",
            icp_asset.amount_available
        );

        // CKBTC amount_available should be unchanged (transfer failed due to drained balance)
        let ckbtc_asset = result
            .link
            .asset_info
            .iter()
            .find(|a| matches!(&a.asset, Asset::IC { address } if *address == ckbtc_ledger))
            .unwrap();
        assert_eq!(
            ckbtc_asset.amount_available, initial_ckbtc_available,
            "CKBTC amount_available should be unchanged after failed withdraw"
        );

        // Verify creator balance changes
        let creator_icp_after = icp_client.balance_of(&creator_account).await.unwrap();
        assert!(
            creator_icp_after > creator_icp_before,
            "Creator should have received ICP back"
        );

        let creator_ckbtc_after = ckbtc_creator_client
            .balance_of(&creator_account)
            .await
            .unwrap();
        assert_eq!(
            creator_ckbtc_after, creator_ckbtc_before,
            "Creator CKBTC balance should be unchanged"
        );

        Ok(())
    })
    .await
    .unwrap();
}
