// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::fixture::LinkTestFixtureV2;
use crate::cashier_backend::link_v2::receive_payment::fixture::{
    activate_payment_link_v2_fixture, create_payment_link_v2_fixture,
};
use crate::utils::link_id_to_account::link_id_to_account;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::{Decode, Nat};
use cashier_backend_types::constant::{FEE_TREASURY_PRINCIPAL, ICP_TOKEN};
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::dto::link::GetLinkOptions;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol};
use cashier_common::constant::CREATE_LINK_FEE;
use cashier_common::test_utils;
use icrc_ledger_types::icrc1::transfer::TransferArg;
use icrc_ledger_types::icrc2::approve::ApproveArgs;

#[tokio::test]
async fn it_should_fail_get_payment_linkv2_details_if_link_not_found() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (test_fixture, _create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens, amounts).await;

        // Act
        let link_id = "non_existent_link_id".to_string();
        let get_links_result = test_fixture.get_link_details_v2(&link_id, None).await;

        // Assert
        assert!(get_links_result.is_err());

        if let Err(err) = get_links_result {
            match err {
                CanisterError::NotFound(msg) => {
                    assert_eq!(msg, "Link not found");
                }
                _ => panic!("Expected NotFound error, got {:?}", err),
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
async fn it_should_succeed_get_payment_linkv2_details_with_no_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (test_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens, amounts).await;

        // Act
        let link_id = create_link_result.link.id;
        let get_links_result = test_fixture.get_link_details_v2(&link_id, None).await;

        // Assert
        assert!(get_links_result.is_ok());
        let link = get_links_result.unwrap().link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.state, LinkState::Active);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_linkv2_details_with_create_action_succeeded() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (test_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens, amounts).await;

        // Act
        let link_id = create_link_result.link.id;
        let option = GetLinkOptions {
            action_type: ActionType::CreateLink,
        };
        let get_links_result = test_fixture
            .get_link_details_v2(&link_id, Some(option))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let get_link_result = get_links_result.unwrap();
        let link = get_link_result.link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.state, LinkState::Active);
        let action = get_link_result.action.unwrap();
        assert_eq!(action.r#type, ActionType::CreateLink);
        assert_eq!(action.state, ActionState::Success);
        assert_eq!(action.intents.len(), 1);
        let intent0 = &action.intents[0];
        assert_eq!(intent0.state, IntentState::Success);
        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_linkv2_details_with_option_action_not_existent() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (test_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens, amounts).await;

        // Act
        let link_id = create_link_result.link.id;
        let option = GetLinkOptions {
            action_type: ActionType::Receive,
        };
        let get_links_result = test_fixture
            .get_link_details_v2(&link_id, Some(option))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let get_link_result = get_links_result.unwrap();
        let link = get_link_result.link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.state, LinkState::Active);
        assert!(get_link_result.action.is_none());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_linkv2_details_with_create_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (test_fixture, create_link_result) =
            create_payment_link_v2_fixture(ctx, caller, tokens, amounts).await;

        let initial_action = create_link_result.action.clone();
        assert_eq!(initial_action.r#type, ActionType::CreateLink);
        assert_eq!(initial_action.state, ActionState::Created);
        assert_eq!(initial_action.intents.len(), 1);
        let initial_intent1 = &initial_action.intents[0];
        assert_eq!(initial_intent1.state, IntentState::Created);
        assert_eq!(initial_intent1.transactions.len(), 2);
        let initial_tx0 = &initial_intent1.transactions[0];
        let initial_tx1 = &initial_intent1.transactions[1];

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

        // Act
        let link_id = create_link_result.link.id;
        let option = GetLinkOptions {
            action_type: ActionType::CreateLink,
        };
        let get_links_result = test_fixture
            .get_link_details_v2(&link_id, Some(option))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let get_link_result = get_links_result.unwrap();
        let link = get_link_result.link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.state, LinkState::CreateLink);
        let action = get_link_result.action.unwrap();
        assert_eq!(action.id, initial_action.id);
        assert_eq!(action.r#type, ActionType::CreateLink);
        assert_eq!(action.state, ActionState::Created);
        assert_eq!(action.intents.len(), 1);

        // Assert Intent1 TransferWalletToTreasury
        let intent1 = &action.intents[0];
        assert_eq!(intent1.state, IntentState::Created);
        assert_eq!(intent1.task, IntentTask::TransferWalletToTreasury);
        match intent1.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(transfer_from.to, Wallet::new(FEE_TREASURY_PRINCIPAL));
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent1.transactions.len(), 2);
        let tx1 = &intent1.transactions[0];
        assert_eq!(tx1.id, initial_tx0.id);
        assert_eq!(tx1.created_at, initial_tx0.created_at);
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent1.transactions[1];
        assert_eq!(tx2.id, initial_tx1.id);
        assert_eq!(tx2.created_at, initial_tx1.created_at);
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert ICRC-112 requests
        assert!(action.icrc_112_requests.is_some());
        let icrc112_requests = action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 2);

        let icrc1_transfer_request = requests
            .iter()
            .find(|req| req.method == "icrc1_transfer")
            .expect("Initial icrc1_transfer request not found");
        let icrc1_transfer_arg = Decode!(&icrc1_transfer_request.arg, TransferArg)
            .expect("Failed to decode initial icrc1_transfer args");
        assert_eq!(
            icrc1_transfer_arg, initial_icrc1_transfer_arg,
            "ICRC1 transfer args do not match"
        );

        let icrc2_approve_request = requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let icrc2_approve_arg = Decode!(&icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");
        assert_eq!(
            icrc2_approve_arg, initial_icrc2_approve_arg,
            "ICRC2 approve args do not match"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_linkv2_details_with_send_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (test_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens.clone(), amounts.clone()).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixtureV2::new(test_fixture.ctx.clone(), caller).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Send,
        };
        let create_action_result = caller_fixture.create_action_v2(create_action_input).await;

        // Assert
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert_eq!(create_action_result.r#type, ActionType::Send);
        assert!(!create_action_result.id.is_empty());
        assert_eq!(create_action_result.creator, caller);

        // Act
        let link_id = create_link_result.link.id;
        let option = GetLinkOptions {
            action_type: ActionType::Send,
        };
        let get_links_result = caller_fixture
            .get_link_details_v2(&link_id, Some(option))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let get_link_result = get_links_result.unwrap();
        let link = get_link_result.link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.state, LinkState::Active);
        assert!(get_link_result.action.is_some());
        let action = get_link_result.action.unwrap();
        assert_eq!(action.r#type, ActionType::Send);
        assert_eq!(action.state, ActionState::Created);
        assert_eq!(action.intents.len(), 1);

        // Assert Intent 1: TransferWalletToLink
        let intent1 = &action.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        amounts[0].clone(),
                        icp_ledger_fee.clone(),
                        1
                    ),
                    "Transfer amount does not match"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        amounts[0].clone(),
                        icp_ledger_fee.clone(),
                        1
                    ),
                    "Icrc1Transfer amount does not match"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_linkv2_details_with_withdraw_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (test_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens.clone(), amounts.clone()).await;

        // Act: disable the link first to make it Inactive
        let link_id = create_link_result.link.id.clone();
        let _disable_link_result = test_fixture.disable_link_v2(&link_id).await;

        // Act: create WITHDRAW action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Withdraw,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Assert
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert_eq!(create_action_result.r#type, ActionType::Withdraw);
        assert!(!create_action_result.id.is_empty());

        // Act
        let link_id = create_link_result.link.id;
        let option = GetLinkOptions {
            action_type: ActionType::Withdraw,
        };
        let get_links_result = test_fixture
            .get_link_details_v2(&link_id, Some(option))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let get_link_result = get_links_result.unwrap();
        let link = get_link_result.link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.state, LinkState::Inactive);
        assert!(get_link_result.action.is_some());
        let action = get_link_result.action.unwrap();
        assert_eq!(action.r#type, ActionType::Withdraw);
        assert_eq!(action.state, ActionState::Created);
        assert_eq!(action.intents.len(), 1);

        // Assert Intent 1: TransferLinkToWallet
        let intent1 = &action.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferLinkToWallet);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.to, Wallet::new(caller));
                assert_eq!(transfer.from, link_id_to_account(ctx, &link_id).into());
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.to, Wallet::new(caller));
                assert_eq!(data.from, link_id_to_account(ctx, &link_id).into());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        Ok(())
    })
    .await
    .unwrap();
}
