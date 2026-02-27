// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::fixture::LinkTestFixtureV2;
use crate::cashier_backend::link_v2::send_basket::fixture::BasketLinkV2Fixture;
use crate::constant::{CKBTC_ICRC_TOKEN, CKUSDC_ICRC_TOKEN, ICP_TOKEN, TESTICP_ICRC_TOKEN};
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::link_id_to_account::fee_treasury_account;
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::{Nat, Principal};
use cashier_backend_types::dto::action::Icrc112Request;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_common::constant::CREATE_LINK_FEE;
use cashier_common::test_utils;
use ic_mple_client::CanisterClientError;
use std::sync::Arc;

#[tokio::test]
async fn it_should_fail_activate_icp_token_basket_linkv2_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;
        let create_link_result = test_fixture.create_link().await;

        let caller = Principal::anonymous();
        let caller_fixture = LinkTestFixtureV2::new(Arc::new(ctx.clone()), caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionV2Input {
            action_id: action_id.clone(),
        };
        let activate_link_result = cashier_backend_client
            .user_process_action_v2(process_action_input)
            .await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = activate_link_result {
            assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", activate_link_result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_activate_icp_token_basket_linkv2_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;
        let create_link_result = test_fixture.create_link().await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixtureV2::new(Arc::new(ctx.clone()), caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionV2Input {
            action_id: action_id.clone(),
        };
        let activate_link_result = cashier_backend_client
            .user_process_action_v2(process_action_input)
            .await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::Unauthorized(err) => {
                    assert_eq!(err, "Only the creator can publish the link");
                }
                _ => {
                    panic!("Expected UnauthorizedError, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_activate_icp_token_basket_linkv2_if_link_not_exists() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;
        let _create_link_result = test_fixture.create_link().await;

        // Act: Activate the link
        let action_id = "not_existing_action_id".to_string();
        let activate_link_result = test_fixture.link_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::NotFound(err) => {
                    assert_eq!(err, "Action not found");
                }
                _ => {
                    panic!("Expected NotFoundError, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_activate_icp_token_basket_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let mut test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts.clone()).await;
        let create_link_result = test_fixture.create_link().await;
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);

        // deposit ICP and asset to caller wallet
        test_fixture.airdrop_icp_and_asset().await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();
        assert_eq!(result.link.state, LinkState::Active);

        // Assert: Link balance after activation
        let link_account = link_id_to_account(ctx, &link_id);
        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        assert_eq!(
            icp_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[0].clone(),
                icp_ledger_fee,
                1
            ),
            "Link balance is incorrect"
        );

        // Assert: Fee treasury balance after activation
        let fee_treasury_account = fee_treasury_account();
        let icp_fee_treasury_balance = icp_ledger_client
            .balance_of(&fee_treasury_account)
            .await
            .unwrap();
        let _icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        assert_eq!(
            icp_fee_treasury_balance,
            Nat::from(CREATE_LINK_FEE),
            "Fee treasury balance is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_activate_icrc_token_basket_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![CKBTC_ICRC_TOKEN.to_string()];
        let amounts = vec![Nat::from(5_000_000u64)];
        let mut test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts.clone()).await;
        let create_link_result = test_fixture.create_link().await;

        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);

        // deposit ICP and asset to caller wallet
        test_fixture.airdrop_icp_and_asset().await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();
        assert_eq!(result.link.state, LinkState::Active);

        // Assert: Link balance after activation
        let link_account = link_id_to_account(ctx, &link_id);
        let ckbtc_link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();

        assert_eq!(
            ckbtc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[0].clone(),
                ckbtc_ledger_fee,
                1
            ),
            "Link balance is incorrect"
        );

        // Assert: Fee treasury balance after activation
        let fee_treasury_account = fee_treasury_account();
        let icp_fee_treasury_balance = icp_ledger_client
            .balance_of(&fee_treasury_account)
            .await
            .unwrap();

        assert_eq!(
            icp_fee_treasury_balance,
            Nat::from(CREATE_LINK_FEE),
            "Fee treasury balance is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_activate_mixed_icrc1_icrc2_token_basket_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: 3 tokens - tICP (ICRC1-only), ckBTC (ICRC2), ckUSDC (ICRC2)
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            TESTICP_ICRC_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(5_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(5_000_000u64),
        ];
        let mut test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts.clone()).await;
        let create_link_result = test_fixture.create_link().await;

        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ticp_ledger_client = ctx.new_icrc_ledger_client(TESTICP_ICRC_TOKEN, creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);

        // deposit ICP (for fees) and all basket assets to caller wallet
        test_fixture.airdrop_icp_and_asset().await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        // tICP -> icrc1_transfer (direct to link), ckBTC/ckUSDC -> icrc2_approve (canister does transfer_from later)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link (canister executes icrc2_transfer_from for ckBTC/ckUSDC)
        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();
        assert_eq!(result.link.state, LinkState::Active);

        // Assert: Link balance for each token after activation
        let link_account = link_id_to_account(ctx, &link_id);

        // tICP (ICRC1-only): direct icrc1_transfer already landed in link
        let ticp_link_balance = ticp_ledger_client.balance_of(&link_account).await.unwrap();
        let ticp_ledger_fee = ticp_ledger_client.fee().await.unwrap();
        assert_eq!(
            ticp_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[0].clone(),
                ticp_ledger_fee,
                1,
            ),
            "tICP link balance is incorrect"
        );

        // ckBTC (ICRC2): canister executed icrc2_transfer_from after approval
        let ckbtc_link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        assert_eq!(
            ckbtc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[1].clone(),
                ckbtc_ledger_fee,
                1,
            ),
            "ckBTC link balance is incorrect"
        );

        // ckUSDC (ICRC2): canister executed icrc2_transfer_from after approval
        let ckusdc_link_balance = ckusdc_ledger_client
            .balance_of(&link_account)
            .await
            .unwrap();
        let ckusdc_ledger_fee = ckusdc_ledger_client.fee().await.unwrap();
        assert_eq!(
            ckusdc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[2].clone(),
                ckusdc_ledger_fee,
                1,
            ),
            "ckUSDC link balance is incorrect"
        );

        // Assert: Fee treasury received ICP fee for link creation
        let fee_treasury_account = fee_treasury_account();
        let icp_fee_treasury_balance = icp_ledger_client
            .balance_of(&fee_treasury_account)
            .await
            .unwrap();

        assert_eq!(
            icp_fee_treasury_balance,
            Nat::from(CREATE_LINK_FEE),
            "Fee treasury balance is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_activate_mixed_basket_if_no_icrc112_executed() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: 3 tokens - tICP (ICRC1-only), ckBTC (ICRC2), ckUSDC (ICRC2)
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            TESTICP_ICRC_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(5_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(5_000_000u64),
        ];
        let mut test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;
        let create_link_result = test_fixture.create_link().await;

        // Airdrop ICP (for fees) and all basket assets
        test_fixture.airdrop_icp_and_asset().await;

        // DO NOT execute any ICRC112 requests - skip entirely

        // Act: Activate the link (should fail - no transfers/approvals done)
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v2(&action_id).await;

        // Assert: canister returns Ok but is_success=false with errors
        assert!(
            activate_link_result.is_ok(),
            "Expected Ok result from canister"
        );
        let result = activate_link_result.unwrap();
        assert!(
            !result.is_success,
            "Expected is_success=false when no ICRC112 executed"
        );
        assert!(
            !result.errors.is_empty(),
            "Expected errors when no ICRC112 executed"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_activate_mixed_basket_if_icrc2_approve_not_done() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: 3 tokens - tICP (ICRC1-only), ckBTC (ICRC2), ckUSDC (ICRC2)
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            TESTICP_ICRC_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(5_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(5_000_000u64),
        ];
        let mut test_fixture =
            BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;
        let create_link_result = test_fixture.create_link().await;

        // Airdrop ICP (for fees) and all basket assets
        test_fixture.airdrop_icp_and_asset().await;

        // Filter ICRC112: keep ONLY icrc1_transfer, skip icrc2_approve
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let filtered_requests: Vec<Vec<Icrc112Request>> = icrc_112_requests
            .into_iter()
            .map(|group| {
                group
                    .into_iter()
                    .filter(|req| req.method == "icrc1_transfer")
                    .collect::<Vec<_>>()
            })
            .filter(|group| !group.is_empty())
            .collect();

        // Execute only the filtered (icrc1_transfer) requests
        let icrc112_execution_result =
            execute_icrc112_request(&filtered_requests, test_fixture.caller, ctx).await;
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link (should fail - no icrc2_approve done)
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v2(&action_id).await;

        // Assert: canister returns Ok but is_success=false with allowance errors
        assert!(
            activate_link_result.is_ok(),
            "Expected Ok result from canister"
        );
        let result = activate_link_result.unwrap();
        assert!(
            !result.is_success,
            "Expected is_success=false when icrc2_approve not done"
        );
        let errors_str = result.errors.join(", ");
        assert!(
            errors_str.contains("InsufficientAllowance"),
            "Expected InsufficientAllowance error, got: {errors_str}"
        );

        Ok(())
    })
    .await
    .unwrap();
}
