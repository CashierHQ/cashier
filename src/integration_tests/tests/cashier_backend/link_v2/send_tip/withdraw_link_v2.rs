// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::fixture::LinkTestFixtureV2;
use crate::cashier_backend::link_v2::send_tip::fixture::activate_tip_link_v2_fixture;
use crate::utils::intent_fee::assert_intent_fees;
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::Nat;
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol};
use cashier_common::test_utils;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_withdraw_icp_token_tip_linkv2_error_if_link_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        // Act: create WITHDRAW action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Withdraw,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = create_action_result {
            assert!(
                msg.contains("Unsupported action type for ActiveState"),
                "Unexpected error message: {}",
                msg
            );
        } else {
            panic!(
                "Expected CanisterError::ValidationErrors, got {:?}",
                create_action_result
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_when_non_creator_create_withdraw_action_tip_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: creator creates and then disables the tip link
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v2(&link_id).await;
        assert!(disable_link_result.is_ok());
        let link_dto = disable_link_result.unwrap();
        assert_eq!(link_dto.state, LinkState::Inactive);

        // Act: another identity attempts to create a WITHDRAW action -> should error
        let other = test_utils::random_principal_id();
        let other_fixture = LinkTestFixtureV2::new(test_fixture.ctx.clone(), other).await;
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Withdraw,
        };
        let create_action_result = other_fixture.create_action_v2(create_action_input).await;

        // Assert: action creation failed for non-creator
        assert!(create_action_result.is_err());
        if let Err(CanisterError::Unauthorized(_)) = create_action_result {
            // expected
        } else {
            panic!("Expected CanisterError::ValidationErrors");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_withdraw_icp_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);
        let link_balance_before = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let withdraw_balance = if link_balance_before > icp_ledger_fee {
            link_balance_before - icp_ledger_fee.clone()
        } else {
            Nat::from(0u64)
        };

        // Act: disable the link first to make it Inactive
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v2(&link_id).await;

        assert!(disable_link_result.is_ok());
        let link_dto = disable_link_result.unwrap();
        assert_eq!(link_dto.state, LinkState::Inactive);

        // Act: create WITHDRAW action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Withdraw,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let action_dto = create_action_result.unwrap();
        let action_id = action_dto.id.clone();
        assert!(!action_id.is_empty());
        assert_eq!(action_dto.r#type, ActionType::Withdraw);
        assert_eq!(action_dto.intents.len(), 1);

        // Assert Intent 1: TransferLinkToWallet
        let intent1 = &action_dto.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferLinkToWallet);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.to, Wallet::new(caller));
                assert_eq!(transfer.from, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount, withdraw_balance,
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
                    data.amount, withdraw_balance,
                    "Icrc1Transfer amount incorrect"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 1 fee fields (LinkToCreator - creator pays outbound fee)
        assert_intent_fees(
            intent1,
            withdraw_balance.clone(),
            icp_ledger_fee.clone(),
            icp_ledger_fee.clone(),
        );

        // Act: process WITHDRAW action
        let process_action_input = ProcessActionV2Input {
            action_id: action_id.clone(),
        };
        let process_action_result = test_fixture.process_action_v2(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_dto = process_action_result.unwrap();
        let link_dto = process_action_dto.link;
        assert_eq!(link_dto.state, LinkState::InactiveEnded);
        let action_dto = process_action_dto.action;
        assert_eq!(action_dto.state, ActionState::Success);

        // Assert: creator balance increased
        let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            icp_balance_after,
            icp_balance_before + withdraw_balance,
            "Creator balance after withdraw should be increased by link balance"
        );

        // Assert: link balance is zero
        let link_balance_after = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance_after,
            Nat::from(0u64),
            "Link balance should be zero"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_withdraw_icrc_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, CKBTC_ICRC_TOKEN, tip_amount).await;
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);
        let link_balance_before = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let withdraw_balance = if link_balance_before > ckbtc_ledger_fee {
            link_balance_before - ckbtc_ledger_fee.clone()
        } else {
            Nat::from(0u64)
        };

        // Act: disable the link first to make it Inactive
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v2(&link_id).await;

        assert!(disable_link_result.is_ok());
        let link_dto = disable_link_result.unwrap();
        assert_eq!(link_dto.state, LinkState::Inactive);

        // Act: create WITHDRAW action
        let link_id = create_link_result.link.id.clone();
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Withdraw,
        };
        let create_action_result = test_fixture.create_action_v2(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let action_dto = create_action_result.unwrap();
        let action_id = action_dto.id.clone();
        assert!(!action_id.is_empty());
        assert_eq!(action_dto.r#type, ActionType::Withdraw);
        assert_eq!(action_dto.intents.len(), 1);

        // Assert Intent 1: TransferLinkToWallet
        let intent1 = &action_dto.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferLinkToWallet);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.to, Wallet::new(caller));
                assert_eq!(transfer.from, link_id_to_account(ctx, &link_id).into());
                assert_eq!(
                    transfer.amount, withdraw_balance,
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
                    data.amount, withdraw_balance,
                    "Icrc1Transfer amount incorrect"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 1 fee fields (LinkToCreator with ckBTC - creator pays outbound fee)
        assert_intent_fees(
            intent1,
            withdraw_balance.clone(),
            ckbtc_ledger_fee.clone(),
            ckbtc_ledger_fee.clone(),
        );

        // Act: process WITHDRAW action
        let process_action_input = ProcessActionV2Input {
            action_id: action_id.clone(),
        };
        let process_action_result = test_fixture.process_action_v2(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_dto = process_action_result.unwrap();
        let link_dto = process_action_dto.link;
        assert_eq!(link_dto.state, LinkState::InactiveEnded);
        let action_dto = process_action_dto.action;
        assert_eq!(action_dto.state, ActionState::Success);

        // Assert: creator balance increased
        let ckbtc_balance_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_balance_after,
            ckbtc_balance_before + withdraw_balance,
            "Creator balance after withdraw should be increased by link balance"
        );

        // Assert: link balance is zero
        let link_balance_after = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance_after,
            Nat::from(0u64),
            "Link balance should be zero"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_when_create_withdraw_action_twice() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: active tip link then disable it
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v2(&link_id).await;
        assert!(disable_link_result.is_ok());
        let link_dto = disable_link_result.unwrap();
        assert_eq!(link_dto.state, LinkState::Inactive);

        // Act: create first WITHDRAW action
        let create_action_input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: ActionType::Withdraw,
        };
        let first = test_fixture
            .create_action_v2(create_action_input.clone())
            .await;
        assert!(first.is_ok());

        // Act: create WITHDRAW action again -> expect error
        let second = test_fixture.create_action_v2(create_action_input).await;
        assert!(second.is_err());

        if let Err(CanisterError::ValidationErrors(_)) = second {
            // expected
        } else {
            panic!("Expected ValidationErrors error when creating WITHDRAW action twice");
        }

        Ok(())
    })
    .await
    .unwrap();
}
