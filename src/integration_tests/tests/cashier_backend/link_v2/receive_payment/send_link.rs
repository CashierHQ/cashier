// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::fixture::LinkTestFixtureV2;
use crate::cashier_backend::link_v2::receive_payment::fixture::{
    activate_payment_link_v2_fixture, create_payment_link_v2_fixture,
};
use crate::utils::icrc_112;
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::Nat;
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::dto::link::GetLinkOptions;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::link_action::v1::LinkUserState;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol};
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_fail_send_icp_token_payment_linkv2_if_link_not_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (creator_fixture, create_link_result) =
            create_payment_link_v2_fixture(ctx, caller, tokens, amounts).await;

        let receiver = TestUser::User2.get_principal();
        let receiver_fixture = LinkTestFixtureV2::new(creator_fixture.ctx.clone(), receiver).await;

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Send,
        };
        let create_action_result = receiver_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = create_action_result {
            assert_eq!(
                msg, "Unsupported action type for Created state",
                "Error message mismatch"
            );
        } else {
            panic!("Expected ValidationErrors error");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_send_icp_token_payment_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (mut creator_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens, amounts.clone()).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture =
            LinkTestFixtureV2::new(creator_fixture.link_fixture.ctx.clone(), caller).await;

        creator_fixture.airdrop_icp_and_asset(caller).await;

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ledger_fee = icp_ledger_client.fee().await.unwrap();

        let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: create SEND action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Send,
        };
        let create_action_result = caller_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.id.is_empty());
        assert_eq!(create_action_result.r#type, ActionType::Send);
        assert_eq!(create_action_result.intents.len(), 1);
        assert_eq!(create_action_result.creator, caller);

        // Assert Intent 1: TransferWalletToLink
        let intent1 = &create_action_result.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    amounts[0].clone(),
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
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    amounts[0].clone(),
                    "Icrc1Transfer amount does not match"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Execute ICRC112 requests
        let icrc_112_requests = create_action_result.icrc_112_requests.unwrap();
        let _icrc112_execution_result =
            icrc_112::execute_icrc112_request(&icrc_112_requests, caller, &caller_fixture.ctx)
                .await;

        // Act: process SEND action
        let process_action_input = ProcessActionV2Input {
            action_id: create_action_result.id.clone(),
        };
        let process_action_result = caller_fixture.process_action_v2(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link_dto = process_action_result.link;
        assert_eq!(link_dto.link_use_action_counter, 0);
        assert_eq!(link_dto.link_use_action_max_count, 1);
        assert_eq!(link_dto.state, LinkState::Active);

        // Assert: amount_available should equal amount_per_use after Send
        assert!(!link_dto.asset_info.is_empty());
        let asset = &link_dto.asset_info[0];
        assert_eq!(
            asset.amount_available, amounts[0],
            "amount_available should equal amount_per_use after Send"
        );

        let action_dto = process_action_result.action;
        assert_eq!(action_dto.state, ActionState::Success);
        let intents = action_dto.intents;
        assert_eq!(intents.len(), 1);
        let intent1 = &intents[0];
        assert_eq!(intent1.state, IntentState::Success);

        // Assert: sender's ICP balance decreased
        let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            icp_balance_after,
            icp_balance_before - amounts[0].clone() - ledger_fee.clone(),
            "Sender's ICP balance should decrease by transfer amount and tip"
        );

        // Assert: link's account balance
        let link_account = link_id_to_account(&caller_fixture.ctx, &link_id);
        let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance,
            amounts[0].clone(),
            "Link balance should be correct"
        );

        // Act: get current user state
        let link_detail_result = caller_fixture
            .get_link_details_v2(
                &link_id,
                Some(GetLinkOptions {
                    action_type: ActionType::Send,
                }),
            )
            .await;

        assert!(link_detail_result.is_ok());
        let link_detail = link_detail_result.unwrap();
        let link_user_state_dto = link_detail.link_user_state;

        assert_eq!(link_user_state_dto.state, Some(LinkUserState::Completed));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_send_icrc_token_payment_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tokens = vec![CKBTC_ICRC_TOKEN.to_string()];
        let amounts = vec![Nat::from(5_000_000u64)];
        let (mut creator_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens.clone(), amounts.clone()).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture =
            LinkTestFixtureV2::new(creator_fixture.link_fixture.ctx.clone(), caller).await;

        creator_fixture.airdrop_icp_and_asset(caller).await;

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ledger_fee = ckbtc_ledger_client.fee().await.unwrap();

        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        // Act: create SEND action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Send,
        };
        let create_action_result = caller_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.id.is_empty());
        assert_eq!(create_action_result.r#type, ActionType::Send);
        assert_eq!(create_action_result.intents.len(), 1);
        assert_eq!(create_action_result.creator, caller);

        // Assert Intent 1: TransferWalletToLink
        let intent1 = &create_action_result.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    amounts[0].clone(),
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
                assert_eq!(data.to, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    amounts[0].clone(),
                    "Icrc1Transfer amount does not match"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Execute ICRC112 requests
        let icrc_112_requests = create_action_result.icrc_112_requests.unwrap();
        let _icrc112_execution_result =
            icrc_112::execute_icrc112_request(&icrc_112_requests, caller, &caller_fixture.ctx)
                .await;

        // Act: process SEND action
        let process_action_input = ProcessActionV2Input {
            action_id: create_action_result.id.clone(),
        };
        let process_action_result = caller_fixture.process_action_v2(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link_dto = process_action_result.link;
        assert_eq!(link_dto.link_use_action_counter, 0);
        assert_eq!(link_dto.link_use_action_max_count, 1);
        assert_eq!(link_dto.state, LinkState::Active);

        // Assert: amount_available should equal amount_per_use after Send
        assert!(!link_dto.asset_info.is_empty());
        let asset = &link_dto.asset_info[0];
        assert_eq!(
            asset.amount_available, amounts[0],
            "amount_available should equal amount_per_use after Send"
        );

        let action_dto = process_action_result.action;
        assert_eq!(action_dto.state, ActionState::Success);
        let intents = action_dto.intents;
        assert_eq!(intents.len(), 1);
        let intent1 = &intents[0];
        assert_eq!(intent1.state, IntentState::Success);

        // Assert: sender CKBTC balance decreased
        let ckbtc_balance_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_balance_after,
            ckbtc_balance_before - amounts[0].clone() - ledger_fee.clone(),
            "Sender's CKBTC balance should decrease by tip amount"
        );

        // Assert: link's account balance
        let link_account = link_id_to_account(&caller_fixture.ctx, &link_id);
        let link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance,
            amounts[0].clone(),
            "Link balance should be correct"
        );

        // Act: get current user state
        let link_detail_result = caller_fixture
            .get_link_details_v2(
                &link_id,
                Some(GetLinkOptions {
                    action_type: ActionType::Send,
                }),
            )
            .await;

        assert!(link_detail_result.is_ok());
        let link_detail = link_detail_result.unwrap();
        let link_user_state_dto = link_detail.link_user_state;

        assert_eq!(link_user_state_dto.state, Some(LinkUserState::Completed));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_return_error_when_create_send_action_twice() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: active payment link
        let tokens = vec![ICP_TOKEN.to_string()];
        let amounts = vec![Nat::from(1_000_000u64)];
        let (mut creator_fixture, create_link_result) =
            activate_payment_link_v2_fixture(ctx, tokens, amounts.clone()).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture =
            LinkTestFixtureV2::new(creator_fixture.link_fixture.ctx.clone(), caller).await;

        creator_fixture.airdrop_icp_and_asset(caller).await;

        // Act: create first SEND action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Send,
        };
        let first_result = caller_fixture
            .create_action_v2(create_action_input.clone())
            .await;
        assert!(first_result.is_ok());

        // Act: create SEND action a second time -> expect error
        let second_result = caller_fixture.create_action_v2(create_action_input).await;
        assert!(second_result.is_err());

        if let Err(CanisterError::ValidationErrors(_msg)) = second_result {
            // expected
        } else {
            panic!("Expected ValidationErrors error when creating SEND action twice");
        }

        Ok(())
    })
    .await
    .unwrap();
}
