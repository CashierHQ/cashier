// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link::fixture::{LinkTestFixture, create_tip_linkv2_fixture};
use crate::constant::{CK_BTC_PRINCIPAL, ICP_PRINCIPAL};
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::link_id_to_account::fee_treasury_account;
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::{Nat, Principal};
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::Icrc112Request;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_common::constant::CREATE_LINK_FEE;
use cashier_common::test_utils;
use ic_mple_client::CanisterClientError;

#[tokio::test]
async fn it_should_error_activate_icp_token_tip_linkv2_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        let caller = Principal::anonymous();
        let caller_fixture = LinkTestFixture::new(test_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionV2Input {
            action_id: action_id.clone(),
        };
        let activate_link_result = cashier_backend_client
            .process_action_v2(process_action_input)
            .await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = activate_link_result {
            assert!(
                err.reject_message
                    .contains("Anonymous caller is not allowed")
            );
        } else {
            panic!("Expected PocketIcTestError, got {:?}", activate_link_result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_activate_icp_token_tip_linkv2_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixture::new(test_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let process_action_input = ProcessActionV2Input {
            action_id: action_id.clone(),
        };
        let activate_link_result = cashier_backend_client
            .process_action_v2(process_action_input)
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
async fn it_should_error_activate_icp_token_tip_linkv2_if_link_not_exists() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, _create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        // Act: Activate the link
        let action_id = "not_existing_action_id".to_string();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

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
async fn it_should_error_activate_icp_token_tip_linkv2_if_insufficient_token_balance_in_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::ValidationErrors(err) => {
                    assert!(err.contains(
                        format!("Insufficient balance for {} asset", ICP_PRINCIPAL).as_str(),
                    ));
                }
                _ => {
                    panic!("Expected ValidationErrors, got different error: {:?}", err);
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
async fn it_should_error_activate_icp_token_tip_linkv2_if_insufficient_icp_allowance_for_creation_fee()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        // Act: Execute only deposit asset tx in ICRC112 requests
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();

        assert_eq!(icrc_112_requests.len(), 1);

        let filtered_icrc_112_requests: Vec<Icrc112Request> = icrc_112_requests[0]
            .iter()
            .filter(|req| req.method == "icrc1_transfer")
            .cloned()
            .collect();

        let icrc112_execution_result =
            execute_icrc112_request(&vec![filtered_icrc_112_requests], test_fixture.caller, ctx)
                .await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::ValidationErrors(err) => {
                    assert!(err.contains(
                        format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str()
                    ));
                }
                _ => {
                    panic!("Expected ValidationErrors, got different error: {:?}", err);
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
async fn it_should_error_activate_icrc_token_tip_linkv2_if_insufficient_token_balance_in_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, 1_000_000u64).await;

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::ValidationErrors(err) => {
                    assert!(err.contains(
                        format!("Insufficient balance for {} asset", CK_BTC_PRINCIPAL).as_str()
                    ));
                }
                _ => {
                    panic!("Expected ValidationErrors, got different error: {:?}", err);
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
async fn it_should_activate_icp_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

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
                tip_amount,
                &icp_ledger_fee,
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
async fn it_should_activate_icrc_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = 5_000_000u64;
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

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
                tip_amount,
                &ckbtc_ledger_fee,
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
