// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v3::{
    fixture::LinkTestFixtureV3, send_tip::fixture::TipLinkV3Fixture,
};
use crate::utils::{
    icrc_112::execute_icrc112_request, link_id_to_account::fee_treasury_account,
    link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context,
};
use candid::{Decode, Nat, Principal};
use cashier_backend_types::{
    constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN},
    error::CanisterError,
    link_v3::dto::action::ProcessActionInputV3,
};
use cashier_common::{constant::CREATE_LINK_FEE, test_utils};
use cashier_shared::types::LinkState as LinkStateShared;
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc2::approve::ApproveArgs;
use std::sync::Arc;

#[tokio::test]
async fn it_should_fail_activate_icp_token_tip_link_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let token_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let test_fixture = TipLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            token,
            tip_amount.clone(),
            token_fee.clone(),
            token_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;

        let caller = Principal::anonymous();
        let caller_fixture =
            LinkTestFixtureV3::new(Arc::new(ctx.clone()), caller, token_fee.clone()).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionInputV3 {
            action_id: action_id.clone(),
        };
        let activate_link_result = cashier_backend_client
            .user_process_action_v3(process_action_input)
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
async fn it_should_fail_activate_icp_token_tip_link_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let token_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let test_fixture = TipLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            token,
            tip_amount.clone(),
            token_fee.clone(),
            token_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture =
            LinkTestFixtureV3::new(Arc::new(ctx.clone()), caller, token_fee.clone()).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionInputV3 {
            action_id: action_id.clone(),
        };
        let activate_link_result = cashier_backend_client
            .user_process_action_v3(process_action_input)
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
async fn it_should_fail_activate_icp_token_tip_link_if_link_not_exists() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let token_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let test_fixture = TipLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            token,
            tip_amount.clone(),
            token_fee.clone(),
            token_fee.clone(),
        )
        .await;
        let _create_link_result = test_fixture.create_link().await;

        // Act: Activate the link
        let action_id = "not_existing_action_id".to_string();
        let activate_link_result = test_fixture.link_fixture.activate_link_v3(&action_id).await;

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
async fn it_should_succeed_activate_icp_token_tip_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let token_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let mut test_fixture = TipLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            token,
            tip_amount.clone(),
            token_fee.clone(),
            token_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);

        // deposit ICP and asset to caller wallet
        test_fixture.airdrop_icp_and_asset().await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();

        let approval_req = &icrc_112_requests[0][0];
        let approval_args: ApproveArgs = Decode!(approval_req.arg.as_slice(), ApproveArgs).unwrap();

        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v3(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();

        assert_eq!(result.link.link_state, LinkStateShared::Active);

        // Assert: Link account balance
        let link_account = link_id_to_account(ctx, &link_id);
        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        assert_eq!(
            icp_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(tip_amount, icp_ledger_fee, 1),
            "Link balance is incorrect"
        );

        // Assert: Treasury account balance
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
async fn it_should_succeed_activate_icrc_token_tip_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);

        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let token_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let mut test_fixture = TipLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            token,
            tip_amount.clone(),
            token_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let create_link_result = test_fixture.create_link().await;

        // deposit ICP and asset to caller wallet
        test_fixture.airdrop_icp_and_asset().await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.link_fixture.activate_link_v3(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let result = activate_link_result.unwrap();
        assert_eq!(result.link.link_state, LinkStateShared::Active);

        // Assert: Link balance after activation
        let link_account = link_id_to_account(ctx, &link_id);
        let ckbtc_link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();

        assert_eq!(
            ckbtc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                tip_amount,
                ckbtc_ledger_fee,
                1,
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
