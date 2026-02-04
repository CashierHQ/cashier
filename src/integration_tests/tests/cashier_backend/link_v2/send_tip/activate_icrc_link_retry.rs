// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::send_tip::fixture::create_tip_linkv2_fixture;
use crate::constant::{CK_BTC_PRINCIPAL, ICP_PRINCIPAL};
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::{Decode, Nat, Principal};
use cashier_backend_types::constant::{self, CKBTC_ICRC_TOKEN};
use cashier_backend_types::repository::action::v1::ActionState;
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::{
    IcTransaction, Protocol, TransactionState,
};
use cashier_common::constant::CREATE_LINK_FEE;
use cashier_common::test_utils;
use icrc_ledger_types::icrc2::approve::ApproveArgs;
use std::time::Duration;

#[tokio::test]
async fn it_should_fail_activate_tip_linkv2_icrc_and_create_new_icrc112_if_icrc112_not_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, caller, token, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];

        let icp_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
            })
            .expect("Initial icrc2_approve request not found");
        let icp_initial_icrc2_approve_arg =
            Decode!(&icp_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial icrc2_approve args");

        let ckbtc_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
            })
            .expect("Initial ckbtc icrc2_approve request not found");
        let ckbtc_initial_icrc2_approve_arg =
            Decode!(&ckbtc_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial ckbtc icrc2_approve args");

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
        assert!(error_message.contains("InsufficientAllowance"));

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

        let intent1 = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .expect("Intent1 not found");

        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::TransferFrom(ref transfer) => {
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
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent1.transactions.len(), 2);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        let tx1 = &intent1.transactions[1];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent1-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .expect("Intent2 not found");

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
            TransactionState::Fail,
            "Intent2-Transaction2 state should be Fail"
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
                "icrc2_approve" => match req.canister_id {
                    cid if cid == Principal::from_text(ICP_PRINCIPAL).unwrap() => {
                        let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode icrc2_approve args");
                        assert_eq!(
                            new_icrc2_approve_args.memo, icp_initial_icrc2_approve_arg.memo,
                            "ICRC2 approve memo should be the same"
                        );
                        let new_created_ts = new_icrc2_approve_args
                            .created_at_time
                            .expect("New icrc2_approve args ts should not be None");
                        let initial_created_ts = icp_initial_icrc2_approve_arg
                            .created_at_time
                            .expect("Initial icrc2_approve args ts should not be None");
                        assert!(
                            (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                            "ICRC2 approve created_at_time should be advanced by 1 day + 1 second"
                        );
                    }
                    cid if cid == Principal::from_text(CK_BTC_PRINCIPAL).unwrap() => {
                        let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode icrc2_approve args");
                        assert_eq!(
                            new_icrc2_approve_args.memo, ckbtc_initial_icrc2_approve_arg.memo,
                            "ICRC2 approve memo should be the same"
                        );
                        let new_created_ts = new_icrc2_approve_args
                            .created_at_time
                            .expect("New icrc2_approve args ts should not be None");
                        let initial_created_ts = ckbtc_initial_icrc2_approve_arg
                            .created_at_time
                            .expect("Initial icrc2_approve args ts should not be None");
                        assert!(
                            (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                            "ICRC2 approve created_at_time should be advanced by 1 day + 1 second"
                        );
                    }
                    _ => panic!("icrc2_approve canister_id should be ICP or CK-BTC"),
                },
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
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, caller, token, tip_amount.clone()).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let _ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let initial_icrc112 = create_link_result.action.icrc_112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];

        let icp_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
            })
            .expect("Initial icrc2_approve request not found");
        let icp_initial_icrc2_approve_arg =
            Decode!(&icp_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial icrc2_approve args");

        let ckbtc_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
            })
            .expect("Initial ckbtc icrc2_approve request not found");
        let ckbtc_initial_icrc2_approve_arg =
            Decode!(&ckbtc_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial ckbtc icrc2_approve args");

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
        assert!(error_message.contains("InsufficientAllowance"));

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

        let intent1 = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .expect("TransferWalletToLink intent not found");
        assert_eq!(
            intent1.state,
            IntentState::Fail,
            "Intent1 state should be Fail"
        );
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::TransferFrom(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.spender, Wallet::new(ctx.cashier_backend_principal));
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent1.transactions.len(), 2);
        let tx0 = &intent1.transactions[0];
        assert_eq!(
            tx0.state,
            TransactionState::Fail,
            "Intent1-Transaction0 state should be Fail"
        );
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }

        let tx1 = &intent1.transactions[1];
        assert_eq!(
            tx1.state,
            TransactionState::Fail,
            "Intent1-Transaction1 state should be Fail"
        );
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .expect("TransferWalletToTreasury intent not found");
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
            TransactionState::Fail,
            "Intent2-Transaction2 state should be Fail"
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
                "icrc2_approve" => match req.canister_id {
                    cid if cid == Principal::from_text(ICP_PRINCIPAL).unwrap() => {
                        let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode icrc2_approve args");
                        assert_eq!(
                            new_icrc2_approve_args, icp_initial_icrc2_approve_arg,
                            "ICRC2 approve arg should be the same"
                        );
                    }
                    cid if cid == Principal::from_text(CK_BTC_PRINCIPAL).unwrap() => {
                        let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode icrc2_approve args");
                        assert_eq!(
                            new_icrc2_approve_args, ckbtc_initial_icrc2_approve_arg,
                            "ICRC2 approve arg should be the same"
                        );
                    }
                    _ => panic!("icrc2_approve canister_id should be ICP or CK-BTC"),
                },
                _ => panic!("Unexpected method in ICRC-112 request"),
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}
