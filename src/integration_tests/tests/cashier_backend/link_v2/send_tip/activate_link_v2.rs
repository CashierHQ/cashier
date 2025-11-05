// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link::fixture::{LinkTestFixture, create_tip_linkv2_fixture};
use crate::constant::{CK_BTC_PRINCIPAL, ICP_PRINCIPAL};
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::link_id_to_account::fee_treasury_account;
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::{Decode, Nat, Principal};
use cashier_backend_types::constant::{self, CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::Icrc112Request;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::action::v1::ActionState;
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::{
    IcTransaction, Protocol, TransactionState,
};
use cashier_common::constant::CREATE_LINK_FEE;
use cashier_common::test_utils;
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::TransferArg;
use icrc_ledger_types::icrc2::approve::ApproveArgs;
use std::time::Duration;

#[tokio::test]
async fn it_should_fail_activate_icp_token_tip_linkv2_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, Nat::from(1_000_000u64)).await;

        let caller = Principal::anonymous();
        let caller_fixture = LinkTestFixture::new(test_fixture.ctx.clone(), &caller).await;
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
async fn it_should_fail_activate_icp_token_tip_linkv2_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, Nat::from(1_000_000u64)).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixture::new(test_fixture.ctx.clone(), &caller).await;
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
async fn it_should_fail_activate_icp_token_tip_linkv2_if_link_not_exists() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, _create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, Nat::from(1_000_000u64)).await;

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
async fn it_should_fail_activate_tip_linkv2_icp_and_return_same_icrc112_if_icrc112_not_executed() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");

        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            2,
            "There should be 2 errors"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", ICP_PRINCIPAL).as_str())
        );
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        icp_ledger_fee.clone(),
                        1
                    )
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        icp_ledger_fee.clone(),
                        1
                    )
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );

                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(new_icrc1_transfer_args, initial_icrc1_transfer_arg);
                }
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(new_icrc2_approve_args, initial_icrc2_approve_arg);
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
async fn it_should_fail_activate_tip_linkv2_icp_and_create_new_icrc112_if_icrc112_not_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Activate the link
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await; // advance time by 1 day + 1 second
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            2,
            "There should be 2 errors"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", ICP_PRINCIPAL).as_str())
        );
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        icp_ledger_fee.clone(),
                        1
                    )
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        icp_ledger_fee.clone(),
                        1
                    )
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );

                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(
                        new_icrc1_transfer_args.to, initial_icrc1_transfer_arg.to,
                        "ICRC1 transfer 'to' field should be the same"
                    );
                    assert_eq!(
                        new_icrc1_transfer_args.from_subaccount,
                        initial_icrc1_transfer_arg.from_subaccount,
                        "ICRC1 transfer 'from_subaccount' field should be the same"
                    );
                    assert_eq!(
                        new_icrc1_transfer_args.amount, initial_icrc1_transfer_arg.amount,
                        "ICRC1 transfer 'amount' field should be the same"
                    );
                    assert_eq!(
                        new_icrc1_transfer_args.fee, initial_icrc1_transfer_arg.fee,
                        "ICRC1 transfer 'fee' field should be the same"
                    );
                    assert_eq!(
                        new_icrc1_transfer_args.memo, initial_icrc1_transfer_arg.memo,
                        "ICRC1 transfer memo should be the same"
                    );
                    let new_created_ts = new_icrc1_transfer_args
                        .created_at_time
                        .expect("New icrc1_transfer args ts should not be None");
                    let initial_created_ts = initial_icrc1_transfer_arg
                        .created_at_time
                        .expect("Initial icrc1_transfer args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC1 transfer created_at_time should be advanced by 1 day + 1 second"
                    );
                }
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args.spender, initial_icrc2_approve_arg.spender,
                        "ICRC2 approve 'spender' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.amount, initial_icrc2_approve_arg.amount,
                        "ICRC2 approve 'amount' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.from_subaccount,
                        initial_icrc2_approve_arg.from_subaccount,
                        "ICRC2 approve 'from_subaccount' field should be the same"
                    );
                    assert_eq!(new_icrc2_approve_args.memo, initial_icrc2_approve_arg.memo);
                    let new_created_ts = new_icrc2_approve_args
                        .created_at_time
                        .expect("New icrc2_approve args ts should not be None");
                    let initial_created_ts = initial_icrc2_approve_arg
                        .created_at_time
                        .expect("Initial icrc2_approve args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC2 approve created_at_time should be advanced by 1 day + 1 second"
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
async fn it_should_create_new_icrc112_with_proper_created_time_if_activate_twice_later_than_1_day()
{
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;

        // Act: Activate the link
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await; // advance time by 1 day + 1 second
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        let icrc1_transfer_request = requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("icrc1_transfer request not found");
        let icrc2_approve_request = requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("icrc2_approve request not found");
        let second_icrc1_transfer_arg = Decode!(&icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode icrc1_transfer args");
        let second_icrc2_approve_arg = Decode!(&icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode icrc2_approve args");

        // Act: Activate the link again
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        let icrc1_transfer_request = requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("icrc1_transfer request not found");
        let icrc2_approve_request = requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("icrc2_approve request not found");
        let third_icrc1_transfer_arg = Decode!(&icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode icrc1_transfer args");
        let third_icrc2_approve_arg = Decode!(&icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode icrc2_approve args");

        assert_eq!(
            third_icrc1_transfer_arg, second_icrc1_transfer_arg,
            "ICRC1 transfer args should be the same on second activation"
        );
        assert_eq!(
            third_icrc2_approve_arg, second_icrc2_approve_arg,
            "ICRC2 approve args should be the same on second activation"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_activate_tip_linkv2_icp_and_return_same_icrc112_if_only_icrc1_transfer_executed()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC1 transfer requests
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
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Success,
            "Intent1 state should be Success"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        icp_ledger_fee.clone(),
                        1
                    )
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Success,
            "Intent1-Transaction0 state should be Success"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        icp_ledger_fee.clone(),
                        1
                    )
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 request in ICRC112");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );

                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args, initial_icrc2_approve_arg,
                        "ICRC2 approve args should be the same"
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
async fn it_should_fail_activate_tip_linkv2_icp_and_create_new_icrc112_if_only_icrc1_transfer_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC1 transfer requests
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
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await; // advance time by 1 day + 1 second
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Success,
            "Intent1 state should be Success"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        icp_ledger_fee.clone(),
                        1
                    )
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Success,
            "Intent1-Transaction0 state should be Success"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        icp_ledger_fee.clone(),
                        1
                    )
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 request in ICRC112");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );

                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args.spender, initial_icrc2_approve_arg.spender,
                        "ICRC2 approve 'spender' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.amount, initial_icrc2_approve_arg.amount,
                        "ICRC2 approve 'amount' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.from_subaccount,
                        initial_icrc2_approve_arg.from_subaccount,
                        "ICRC2 approve 'from_subaccount' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.memo, initial_icrc2_approve_arg.memo,
                        "ICRC2 approve memo should be the same"
                    );
                    let new_created_ts = new_icrc2_approve_args
                        .created_at_time
                        .expect("New icrc2_approve args ts should not be None");
                    let initial_created_ts = initial_icrc2_approve_arg
                        .created_at_time
                        .expect("Initial icrc2_approve args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC2 approve created_at_time should be advanced by 1 day + 1 second"
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
async fn it_should_fail_activate_tip_linkv2_icp_and_return_same_icrc112_if_only_icrc2_approve_executed()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC2 approve requests
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();

        assert_eq!(icrc_112_requests.len(), 1);

        let filtered_icrc_112_requests: Vec<Icrc112Request> = icrc_112_requests[0]
            .iter()
            .filter(|req| req.method == "icrc2_approve")
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
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        icp_ledger_fee.clone(),
                        1
                    )
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        icp_ledger_fee.clone(),
                        1
                    )
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Created,
            "Intent2 state should be Created"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Success,
            "Intent2-Transaction1 state should be Success"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 request in ICRC112");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(
                        new_icrc1_transfer_args, initial_icrc1_transfer_arg,
                        "ICRC1 transfer arg should be the same"
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
async fn it_should_fail_activate_tip_linkv2_icp_and_create_new_icrc112_if_only_icrc2_approve_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC2 approve requests
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();

        assert_eq!(icrc_112_requests.len(), 1);

        let filtered_icrc_112_requests: Vec<Icrc112Request> = icrc_112_requests[0]
            .iter()
            .filter(|req| req.method == "icrc2_approve")
            .cloned()
            .collect();

        let icrc112_execution_result =
            execute_icrc112_request(&vec![filtered_icrc_112_requests], test_fixture.caller, ctx)
                .await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await; // advance time by 1 day + 1 second
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        icp_ledger_fee.clone(),
                        1
                    )
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        icp_ledger_fee.clone(),
                        1
                    )
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Created,
            "Intent2 state should be Created"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Success,
            "Intent2-Transaction1 state should be Success"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 request in ICRC112");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(
                        new_icrc1_transfer_args.memo, initial_icrc1_transfer_arg.memo,
                        "ICRC1 transfer memo should be the same"
                    );
                    let new_created_ts = new_icrc1_transfer_args
                        .created_at_time
                        .expect("New icrc1_transfer args ts should not be None");
                    let initial_created_ts = initial_icrc1_transfer_arg
                        .created_at_time
                        .expect("Initial icrc1_transfer args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC1 transfer created_at_time should be advanced by 1 day + 1 second"
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
async fn it_should_fail_activate_tip_linkv2_icrc_and_return_same_icrc112_if_icrc112_not_executed() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Activate the link
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            2,
            "There should be 2 errors"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", CK_BTC_PRINCIPAL).as_str())
        );
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link should be accurate"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link in transaction should be accurate"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
                    );
                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(
                        new_icrc1_transfer_args, initial_icrc1_transfer_arg,
                        "ICRC1 transfer arg should be the same"
                    );
                }
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args, _initial_icrc2_approve_arg,
                        "ICRC2 approve arg should be the same"
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
async fn it_should_fail_activate_tip_linkv2_icrc_and_create_new_icrc112_if_icrc112_not_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Activate the link
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await; // advance time by 1 day + 1 second
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            2,
            "There should be 2 errors"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", CK_BTC_PRINCIPAL).as_str())
        );
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link should be accurate"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link in transaction should be accurate"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
                    );
                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(
                        new_icrc1_transfer_args.memo, initial_icrc1_transfer_arg.memo,
                        "ICRC1 transfer memo should be the same"
                    );
                    let new_created_ts = new_icrc1_transfer_args
                        .created_at_time
                        .expect("New icrc1_transfer args ts should not be None");
                    let initial_created_ts = initial_icrc1_transfer_arg
                        .created_at_time
                        .expect("Initial icrc1_transfer args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC1 transfer created_at_time should be advanced by 1 day + 1 second"
                    );
                }
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args.memo, _initial_icrc2_approve_arg.memo,
                        "ICRC2 approve memo should be the same"
                    );
                    let new_created_ts = new_icrc2_approve_args
                        .created_at_time
                        .expect("New icrc2_approve args ts should not be None");
                    let initial_created_ts = _initial_icrc2_approve_arg
                        .created_at_time
                        .expect("Initial icrc2_approve args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC2 approve created_at_time should be advanced by 1 day + 1 second"
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
async fn it_should_fail_activate_tip_linkv2_icrc_and_create_new_icrc112_if_only_icrc1_transfer_executed()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let _initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC1 transfer requests
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
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Success,
            "Intent1 state should be Success"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link should be accurate"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Success,
            "Intent1-Transaction0 state should be Success"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link in transaction should be accurate"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args, _initial_icrc2_approve_arg,
                        "ICRC2 approve args should be the same"
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
async fn it_should_fail_activate_tip_linkv2_icrc_and_create_new_icrc112_if_only_icrc1_transfer_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let _initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC1 transfer requests
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
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await; // advance time by 1 day + 1 second
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient allowance for {} asset", ICP_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Success,
            "Intent1 state should be Success"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link should be accurate"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Success,
            "Intent1-Transaction0 state should be Success"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link in transaction should be accurate"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Fail,
            "Intent2 state should be Fail"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent2-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args.memo, _initial_icrc2_approve_arg.memo,
                        "ICRC2 approve memo should be the same"
                    );
                    let new_created_ts = new_icrc2_approve_args
                        .created_at_time
                        .expect("New icrc2_approve args ts should not be None");
                    let initial_created_ts = _initial_icrc2_approve_arg
                        .created_at_time
                        .expect("Initial icrc2_approve args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC2 approve created_at_time should be advanced by 1 day + 1 second"
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
async fn it_should_fail_activate_tip_linkv2_icrc_and_create_new_icrc112_if_only_icrc2_approve_executed()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let _initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC2 approve requests
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();

        assert_eq!(icrc_112_requests.len(), 1);

        let filtered_icrc_112_requests: Vec<Icrc112Request> = icrc_112_requests[0]
            .iter()
            .filter(|req| req.method == "icrc2_approve")
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
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", CK_BTC_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link should be accurate"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link in transaction should be accurate"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Created,
            "Intent2 state should be Created"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Success,
            "Intent2-Transaction1 state should be Success"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
                    );
                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(
                        new_icrc1_transfer_args, _initial_icrc1_transfer_arg,
                        "ICRC1 transfer args should be the same"
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
async fn it_should_fail_activate_tip_linkv2_icrc_and_create_new_icrc112_if_only_icrc2_approve_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];
        let initial_icrc1_transfer_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let _initial_icrc1_transfer_arg = Decode!(&initial_icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let _initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

        // Act: Execute only ICRC2 approve requests
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();

        assert_eq!(icrc_112_requests.len(), 1);

        let filtered_icrc_112_requests: Vec<Icrc112Request> = icrc_112_requests[0]
            .iter()
            .filter(|req| req.method == "icrc2_approve")
            .cloned()
            .collect();

        let icrc112_execution_result =
            execute_icrc112_request(&vec![filtered_icrc_112_requests], test_fixture.caller, ctx)
                .await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await; // advance time by 1 day + 1 second
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            1,
            "There should be 1 error"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(
            error_message
                .contains(format!("Insufficient balance for {} asset", CK_BTC_PRINCIPAL).as_str())
        );

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.state,
            LinkState::CreateLink,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert Intent 1: TransferWalletToLink
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );
        let link_id = activate_link_result.link.id.clone();

        let intent1 = &activate_link_result.action.intents[0];
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link should be accurate"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        ckbtc_ledger_fee.clone(),
                        1
                    ),
                    "The transfer amount to link in transaction should be accurate"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &activate_link_result.action.intents[1];
        assert_eq!(
            intent2.state,
            IntentState::Created,
            "Intent2 state should be Created"
        );
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        assert_eq!(
            tx1.state,
            TransactionState::Success,
            "Intent2-Transaction1 state should be Success"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        assert_eq!(
            tx2.state,
            TransactionState::Created,
            "Intent2-Transaction2 state should be Created"
        );
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert: ICRC112 requests
        assert!(activate_link_result.action.icrc_112_requests.is_some());
        let icrc112_requests = activate_link_result.action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
                    );
                    let new_icrc1_transfer_args = Decode!(&req.arg, TransferArg)
                        .expect("Failed to decode icrc1_transfer args");
                    assert_eq!(
                        new_icrc1_transfer_args.memo, _initial_icrc1_transfer_arg.memo,
                        "ICRC1 transfer memo should be the same"
                    );
                    let new_created_ts = new_icrc1_transfer_args
                        .created_at_time
                        .expect("New icrc1_transfer args ts should not be None");
                    let initial_created_ts = _initial_icrc1_transfer_arg
                        .created_at_time
                        .expect("Initial icrc1_transfer args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC1 transfer created_at_time should be advanced by 1 day + 1 second"
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
async fn it_should_fail_reexecute_icrc112_icp_immediately_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };

        let initial_caller_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(ctx, &link_id);
        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();

        let balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            balance_after_first_execution,
            initial_caller_balance
                - test_utils::calculate_amount_for_wallet_to_link_transfer(
                    tip_amount,
                    icp_ledger_fee.clone(),
                    1
                )
                - Nat::from(2u64) * icp_ledger_fee, // 1 transfer fee for deposit to link and 1 transfer fee to approve the creation fee
            "Caller balance after first execution is incorrect"
        );

        // Act: Re-execute ICRC112 requests
        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 re-execution result contains deduplication errors
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        // Expected error due to deduplication
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(s.contains(
                            "transaction is a duplicate of another transaction in block"
                        ));
                    }
                    Ok(_) => {
                        panic!(
                            "Expected an error (decode or protocol), got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balance should remain unchanged due to deduplication
        let balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            balance_after_reexecution, balance_after_first_execution,
            "Caller balance after re-execution should be unchanged due to deduplication"
        );

        let icp_link_balance_after_reexecution =
            icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            icp_link_balance_after_reexecution, icp_link_balance,
            "Link balance after re-execution should be unchanged due to deduplication"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_reexecute_icrc112_icp_after_1week_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };

        let initial_caller_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(ctx, &link_id);
        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();

        let balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            balance_after_first_execution,
            initial_caller_balance
                - test_utils::calculate_amount_for_wallet_to_link_transfer(
                    tip_amount,
                    icp_ledger_fee.clone(),
                    1
                )
                - Nat::from(2u64) * icp_ledger_fee, // 1 transfer fee for deposit to link and 1 transfer fee to approve the creation fee
            "Caller balance after first execution is incorrect"
        );

        // Act: Re-execute ICRC112 requests after 1 week
        // Advance time by 7 days + 1 second
        ctx.advance_time(Duration::from_secs(7 * 24 * 3600 + 1))
            .await;

        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 re-execution result contains deduplication errors
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        // Expected error due to deduplication
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(s.contains("transaction's created_at_time is too far in the past"));
                    }
                    Ok(_) => {
                        panic!(
                            "Expected an error (decode or protocol), got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balance should remain unchanged due to deduplication
        let balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            balance_after_reexecution, balance_after_first_execution,
            "Caller balance after re-execution should be unchanged due to deduplication"
        );

        let icp_link_balance_after_reexecution =
            icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            icp_link_balance_after_reexecution, icp_link_balance,
            "Link balance after re-execution should be unchanged due to deduplication"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_activate_icp_token_tip_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount.clone()).await;
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
            test_utils::calculate_amount_for_wallet_to_link_transfer(tip_amount, icp_ledger_fee, 1),
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
async fn it_should_fail_reexecute_icrc112_icrc_immediately_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(5_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let _icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let initial_icp_caller_balance =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let initial_ckbtc_caller_balance = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        let icp_caller_balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_caller_balance_after_first_execution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        assert_eq!(
            icp_caller_balance_after_first_execution,
            initial_icp_caller_balance - Nat::from(CREATE_LINK_FEE),
            "ICP Caller balance after first execution is incorrect"
        );

        assert_eq!(
            ckbtc_caller_balance_after_first_execution,
            initial_ckbtc_caller_balance
                - test_utils::calculate_amount_for_wallet_to_link_transfer(
                    tip_amount,
                    ckbtc_ledger_fee.clone(),
                    1,
                )
                - ckbtc_ledger_fee.clone(), // 1 transfer fee for deposit to link
            "CKBTC Caller balance after first execution is incorrect"
        );

        // Act: Re-execute ICRC112 requests
        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 re-execution result contains deduplication errors
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        // Expected error due to deduplication
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(s.contains(
                            "transaction is a duplicate of another transaction in block"
                        ));
                    }
                    Ok(_) => {
                        panic!(
                            "Expected an error (decode or protocol), got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balance should remain unchanged due to deduplication
        let icp_caller_balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            icp_caller_balance_after_reexecution, icp_caller_balance_after_first_execution,
            "ICP Caller balance after re-execution should be unchanged due to deduplication"
        );

        let ckbtc_caller_balance_after_reexecution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_caller_balance_after_reexecution, ckbtc_caller_balance_after_first_execution,
            "CKBTC Caller balance after re-execution should be unchanged due to deduplication"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_reexecute_icrc112_icrc_after_1week_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(5_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let _icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let initial_icp_caller_balance =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let initial_ckbtc_caller_balance = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        let icp_caller_balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_caller_balance_after_first_execution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        assert_eq!(
            icp_caller_balance_after_first_execution,
            initial_icp_caller_balance - Nat::from(CREATE_LINK_FEE),
            "ICP Caller balance after first execution is incorrect"
        );

        assert_eq!(
            ckbtc_caller_balance_after_first_execution,
            initial_ckbtc_caller_balance
                - test_utils::calculate_amount_for_wallet_to_link_transfer(
                    tip_amount,
                    ckbtc_ledger_fee.clone(),
                    1,
                )
                - ckbtc_ledger_fee.clone(), // 1 transfer fee for deposit to link
            "CKBTC Caller balance after first execution is incorrect"
        );

        // Act: Re-execute ICRC112 requests
        // Advance time by 7 days + 1 second
        ctx.advance_time(Duration::from_secs(7 * 24 * 3600 + 1))
            .await;

        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

        // Assert: ICRC112 re-execution result contains deduplication errors
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        // Expected error due to deduplication
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(s.contains("transaction's created_at_time is too far in the past"));
                    }
                    Ok(_) => {
                        panic!(
                            "Expected an error (decode or protocol), got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balance should remain unchanged due to deduplication
        let icp_caller_balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            icp_caller_balance_after_reexecution, icp_caller_balance_after_first_execution,
            "ICP Caller balance after re-execution should be unchanged due to deduplication"
        );

        let ckbtc_caller_balance_after_reexecution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_caller_balance_after_reexecution, ckbtc_caller_balance_after_first_execution,
            "CKBTC Caller balance after re-execution should be unchanged due to deduplication"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_activate_icrc_token_tip_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(5_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount.clone()).await;

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
