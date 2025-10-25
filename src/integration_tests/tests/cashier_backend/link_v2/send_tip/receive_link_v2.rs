// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link::fixture::{
    activate_tip_link_v2_fixture, create_tip_linkv2_fixture,
};
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::Nat;
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol};
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_receive_icp_token_tip_linkv2_error_if_link_not_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

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
async fn it_should_receive_icp_token_tip_linkv2_error_if_more_than_once() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Act: process RECEIVE action
        let action_dto = create_action_result.unwrap();
        let action_id = action_dto.id.clone();
        let process_action_input = ProcessActionV2Input { action_id };
        let _process_action_result = test_fixture.process_action_v2(process_action_input).await;

        // Act: create RECEIVE action again
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Assert: action creation failed
        assert!(create_action_result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = create_action_result {
            assert_eq!(msg, "Unsupported link state", "Error message mismatch");
        } else {
            panic!("Expected ValidationErrors error");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_receive_icp_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.id.is_empty());
        assert_eq!(create_action_result.r#type, ActionType::Receive);
        assert_eq!(create_action_result.intents.len(), 1);

        // Assert Intent 1: TransferLinkToWallet
        let intent1 = &create_action_result.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferLinkToWallet);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.to, Wallet::new(caller));
                assert_eq!(transfer.from, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    Nat::from(tip_amount),
                    "Transfer amount incorrect"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.to, Wallet::new(caller));
                assert_eq!(data.from, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    Nat::from(tip_amount),
                    "Icrc1Transfer amount incorrect"
                );
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Act: process RECEIVE action
        let process_action_input = ProcessActionV2Input {
            action_id: create_action_result.id.clone(),
        };
        let process_action_result = test_fixture.process_action_v2(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link_dto = process_action_result.link;
        assert_eq!(link_dto.link_use_action_counter, 1);
        assert_eq!(link_dto.link_use_action_max_count, 1);
        assert_eq!(link_dto.state, LinkState::InactiveEnded);

        let action_dto = process_action_result.action;
        assert_eq!(action_dto.state, ActionState::Success);
        let intents = action_dto.intents;
        assert_eq!(intents.len(), 1);
        let intent1 = &intents[0];
        assert_eq!(intent1.state, IntentState::Success);

        // Assert: receiveer's ICP balance increased
        let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            icp_balance_after,
            icp_balance_before + Nat::from(tip_amount),
            "Receiveer's ICP balance should increase by tip amount"
        );

        // Assert: link's account balance is zero
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);
        let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance,
            Nat::from(0u64),
            "Link balance should be equal to zero"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_receive_icrc_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount).await;

        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.id.is_empty());
        assert_eq!(create_action_result.r#type, ActionType::Receive);
        assert_eq!(create_action_result.intents.len(), 1);

        // Assert Intent 1: TransferLinkToWallet
        let intent1 = &create_action_result.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferLinkToWallet);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.to, Wallet::new(caller));
                assert_eq!(transfer.from, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount,
                    Nat::from(tip_amount),
                    "Transfer amount incorrect"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.to, Wallet::new(caller));
                assert_eq!(data.from, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    data.amount,
                    Nat::from(tip_amount),
                    "Icrc1Transfer amount incorrect"
                );
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Act: process RECEIVE action
        let process_action_input = ProcessActionV2Input {
            action_id: create_action_result.id.clone(),
        };
        let process_action_result = test_fixture.process_action_v2(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link_dto = process_action_result.link;
        assert_eq!(link_dto.link_use_action_counter, 1);
        assert_eq!(link_dto.link_use_action_max_count, 1);
        assert_eq!(link_dto.state, LinkState::InactiveEnded);

        let action_dto = process_action_result.action;
        assert_eq!(action_dto.state, ActionState::Success);
        let intents = action_dto.intents;
        assert_eq!(intents.len(), 1);
        let intent1 = &intents[0];
        assert_eq!(intent1.state, IntentState::Success);

        // Assert: receiveer's CKBTC balance increased
        let ckbtc_balance_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_balance_after,
            ckbtc_balance_before + Nat::from(tip_amount),
            "Receiveer's CKBTC balance should increase by tip amount"
        );

        // Assert: link's account balance is zero
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);
        let link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance,
            Nat::from(0u64),
            "Link balance should be equal to zero"
        );

        Ok(())
    })
    .await
    .unwrap();
}
