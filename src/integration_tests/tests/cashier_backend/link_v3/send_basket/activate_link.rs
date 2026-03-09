// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{error::CanisterError, link_v3::dto::action::ProcessActionInputV3};
use cashier_common::{constant::CREATE_LINK_FEE, test_utils};
use cashier_shared::types::LinkState as LinkStateShared;
use ic_mple_client::CanisterClientError;
use std::sync::Arc;

use crate::{
    cashier_backend::link_v3::{fixture::LinkTestFixtureV3, send_basket::fixture::BasketLinkV3Fixture},
    constant::{CKBTC_ICRC_TOKEN, CKUSDC_ICRC_TOKEN, ICP_TOKEN},
    utils::{
        icrc_112::execute_icrc112_request, link_id_to_account::fee_treasury_account,
        link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context,
    },
};

#[tokio::test]
async fn it_should_fail_activate_icp_token_basket_link_v3_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];
        let test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            creator,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;

        let caller = candid::Principal::anonymous();
        let caller_fixture =
            LinkTestFixtureV3::new(Arc::new(ctx.clone()), caller, icp_fee.clone()).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionInputV3 { action_id };
        let activate_link_result = cashier_backend_client
            .user_process_action_v3(process_action_input)
            .await;

        // Assert
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
async fn it_should_fail_activate_icp_token_basket_link_v3_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];
        let test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            creator,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture =
            LinkTestFixtureV3::new(Arc::new(ctx.clone()), caller, icp_fee.clone()).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionInputV3 { action_id };
        let activate_link_result = cashier_backend_client
            .user_process_action_v3(process_action_input)
            .await;

        // Assert
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::Unauthorized(err) => {
                    assert_eq!(err, "Only the creator can publish the link");
                }
                _ => panic!("Expected UnauthorizedError, got {:?}", err),
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
async fn it_should_fail_activate_icp_token_basket_link_v3_if_link_not_exists() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];
        let test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            creator,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;
        let _create_link_result = test_fixture.create_link().await;

        // Act
        let activate_link_result = test_fixture
            .link_fixture
            .activate_link_v3("not_existing_action_id")
            .await;

        // Assert
        assert!(activate_link_result.is_err());
        if let Err(err) = activate_link_result {
            match err {
                CanisterError::NotFound(err) => assert_eq!(err, "Action not found"),
                _ => panic!("Expected NotFoundError, got {:?}", err),
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
async fn it_should_succeed_activate_icp_token_basket_link_v3() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];
        let mut test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            creator,
            tokens,
            amounts.clone(),
            token_fees,
            icp_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);

        test_fixture.airdrop_icp_and_asset().await;

        // Act
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;
        assert!(icrc112_execution_result.is_ok());

        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v3(&action_id).await;

        // Assert
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();
        assert_eq!(result.link.link_state, LinkStateShared::Active);

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
async fn it_should_succeed_activate_icrc_token_basket_link_v3() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee.clone(), ckusdc_fee];
        let mut test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            creator,
            tokens,
            amounts.clone(),
            token_fees,
            icp_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;

        test_fixture.airdrop_icp_and_asset().await;

        // Act
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;
        assert!(icrc112_execution_result.is_ok());

        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v3(&action_id).await;

        // Assert
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();
        assert_eq!(result.link.link_state, LinkStateShared::Active);

        let link_account = link_id_to_account(ctx, &link_id);
        let ckbtc_link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        assert_eq!(
            ckbtc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[1].clone(),
                ckbtc_ledger_fee,
                1
            ),
            "Link balance is incorrect"
        );

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
async fn it_should_succeed_activate_mixed_icrc2_token_basket_link_v3() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: ICP + ckBTC + ckUSDC
        let creator = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];

        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee.clone(), ckusdc_fee.clone()];

        let mut test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            creator,
            tokens,
            amounts.clone(),
            token_fees,
            icp_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;

        test_fixture.airdrop_icp_and_asset().await;

        // Act
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;
        assert!(icrc112_execution_result.is_ok());

        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v3(&action_id).await;

        // Assert
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();
        assert_eq!(result.link.link_state, LinkStateShared::Active);

        let link_account = link_id_to_account(ctx, &link_id);

        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let icp_fee_now = icp_ledger_client.fee().await.unwrap();
        assert_eq!(
            icp_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[0].clone(),
                icp_fee_now,
                1
            ),
            "ICP link balance is incorrect"
        );

        let ckbtc_link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckbtc_fee_now = ckbtc_ledger_client.fee().await.unwrap();
        assert_eq!(
            ckbtc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[1].clone(),
                ckbtc_fee_now,
                1
            ),
            "ckBTC link balance is incorrect"
        );

        let ckusdc_link_balance = ckusdc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckusdc_fee_now = ckusdc_ledger_client.fee().await.unwrap();
        assert_eq!(
            ckusdc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                amounts[2].clone(),
                ckusdc_fee_now,
                1
            ),
            "ckUSDC link balance is incorrect"
        );

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
