// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::action::{CreateActionInputV3, ProcessActionInputV3},
    repository::{action::v1::ActionType, link_action::v1::LinkUserState},
};
use cashier_common::test_utils;
use cashier_shared::types::{
    ActionState as ActionStateShared, ActionType as ActionTypeShared,
    AddressType as AddressTypeShared, IntentState as IntentStateShared,
    LinkState as LinkStateShared,
};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3,
        send_airdrop::fixture::{activate_airdrop_link_v3_fixture, create_airdrop_link_v3_fixture},
    },
    constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN},
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_fail_receive_icp_token_airdrop_link_if_link_not_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 10;
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, create_link_result) = create_airdrop_link_v3_fixture(
            ctx,
            creator,
            token,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let receiver = TestUser::User2.get_principal();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let receive_action = receiver_fixture.receive_action(link_id.clone(), receiver);
        let create_action_input = CreateActionInputV3 {
            link_id,
            action: receive_action,
        };
        let create_action_result = receiver_fixture.create_action_v3(create_action_input).await;

        // Assert
        assert!(create_action_result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = create_action_result {
            assert_eq!(msg, "Unsupported action type for Created state");
        } else {
            panic!("Expected ValidationErrors error");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_receive_icp_token_airdrop_link_if_requested_more_than_max_use() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let max_use_count = 1;
        let airdrop_amount = Nat::from(1_000_000u64);
        let creator = TestUser::User1.get_principal();
        let receiver1 = TestUser::User2.get_principal();
        let receiver2 = TestUser::User3.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let link_id = activate_link_result.link.id.clone();
        let receiver1_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver1, icp_fee.clone()).await;
        let receiver2_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver2, icp_fee.clone()).await;

        // Act: first receive consumes the only available use
        let receive_action = receiver1_fixture.receive_action(link_id.clone(), receiver1);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: receive_action,
        };
        let create_action_result = receiver1_fixture.create_action_v3(create_action_input).await;
        assert!(create_action_result.is_ok());
        let process_action_result = receiver1_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: create_action_result.unwrap().action.id,
            })
            .await;
        assert!(process_action_result.is_ok());

        // Act: second receive from another principal should fail
        let second_receive_action = receiver2_fixture.receive_action(link_id.clone(), receiver2);
        let second_create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: second_receive_action,
        };
        let second_create_action_result = receiver2_fixture
            .create_action_v3(second_create_action_input)
            .await;

        // Assert
        assert!(second_create_action_result.is_err());
        if let Err(err) = second_create_action_result {
            match err {
                CanisterError::ValidationErrors(msg) => {
                    assert_eq!(msg, "Unsupported action type for current link state");
                }
                CanisterError::HandleLogicError(msg) => {
                    assert_eq!(msg, "Cannot create action for link in state Ended");
                }
                _ => panic!("Expected state-related validation error, got {:?}", err),
            }
        } else {
            panic!("Expected create action error");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_receive_icp_token_airdrop_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let max_use_count = 10;
        let creator = TestUser::User1.get_principal();
        let receiver = TestUser::User2.get_principal();
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount.clone(),
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;
        let receiver_account = Account {
            owner: receiver,
            subaccount: None,
        };
        let receiver_icp_ledger_client = ctx.new_icp_ledger_client(receiver);
        let icp_balance_before = receiver_icp_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();

        // Act
        let link_id = activate_link_result.link.id.clone();
        let receive_action = receiver_fixture.receive_action(link_id.clone(), receiver);
        let create_action_result = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receive_action,
            })
            .await;

        // Assert: create action
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.action.id.is_empty());
        assert_eq!(
            create_action_result.action.action_type,
            ActionTypeShared::Receive
        );
        assert_eq!(create_action_result.action.intents.len(), 1);
        assert_eq!(create_action_result.action.creator, receiver);

        let intent = &create_action_result.action.intents[0];
        assert_eq!(intent.intent_state, IntentStateShared::Created);
        assert_eq!(intent.source_address_type, AddressTypeShared::Link);
        assert_eq!(intent.dest_address_type, AddressTypeShared::User);
        assert_eq!(intent.dest_address, receiver);
        assert_eq!(intent.amount, airdrop_amount);

        // Act: process action
        let process_action_result = receiver_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: create_action_result.action.id.clone(),
            })
            .await;

        // Assert: process action
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link = process_action_result.link;
        assert_eq!(link.max_use, max_use_count);
        assert_eq!(link.use_count, 1);
        assert_eq!(link.link_state, LinkStateShared::Active);

        let action = process_action_result.action;
        assert_eq!(action.action_state, ActionStateShared::Success);
        assert_eq!(action.intents.len(), 1);
        assert_eq!(action.intents[0].intent_state, IntentStateShared::Success);

        let icp_balance_after = receiver_icp_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        assert_eq!(
            icp_balance_after,
            icp_balance_before + Nat::from(1_000_000u64),
            "Receiver ICP balance should increase by one receive amount"
        );

        let link_account = link_id_to_account(&receiver_fixture.ctx, &link_id);
        let link_balance = receiver_icp_ledger_client
            .balance_of(&link_account)
            .await
            .unwrap();
        assert_eq!(
            link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                Nat::from(1_000_000u64),
                icp_fee,
                max_use_count - 1,
            ),
            "Link balance should have enough amount for remaining uses"
        );

        let link_detail_result = receiver_fixture
            .get_link_details_v3(
                &link_id,
                Some(GetLinkOptions {
                    action_type: ActionType::Receive,
                }),
            )
            .await;
        assert!(link_detail_result.is_ok());
        let link_detail = link_detail_result.unwrap();
        assert_eq!(link_detail.link_user_state, Some(LinkUserState::Completed));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_receive_icrc_token_airdrop_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let max_use_count = 10;
        let creator = TestUser::User1.get_principal();
        let receiver = TestUser::User2.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let airdrop_amount = Nat::from(5_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount.clone(),
            max_use_count,
            ckbtc_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;
        let receiver_account = Account {
            owner: receiver,
            subaccount: None,
        };
        let receiver_ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, receiver);
        let ckbtc_balance_before = receiver_ckbtc_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();

        // Act
        let link_id = activate_link_result.link.id.clone();
        let receive_action = receiver_fixture.receive_action(link_id.clone(), receiver);
        let create_action_result = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receive_action,
            })
            .await;

        // Assert: create action
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.action.id.is_empty());
        assert_eq!(
            create_action_result.action.action_type,
            ActionTypeShared::Receive
        );
        assert_eq!(create_action_result.action.intents.len(), 1);
        assert_eq!(create_action_result.action.creator, receiver);

        let intent = &create_action_result.action.intents[0];
        assert_eq!(intent.intent_state, IntentStateShared::Created);
        assert_eq!(intent.source_address_type, AddressTypeShared::Link);
        assert_eq!(intent.dest_address_type, AddressTypeShared::User);
        assert_eq!(intent.dest_address, receiver);
        assert_eq!(intent.amount, airdrop_amount);

        // Act: process action
        let process_action_result = receiver_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: create_action_result.action.id.clone(),
            })
            .await;

        // Assert: process action
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link = process_action_result.link;
        assert_eq!(link.max_use, max_use_count);
        assert_eq!(link.use_count, 1);
        assert_eq!(link.link_state, LinkStateShared::Active);

        let action = process_action_result.action;
        assert_eq!(action.action_state, ActionStateShared::Success);
        assert_eq!(action.intents.len(), 1);
        assert_eq!(action.intents[0].intent_state, IntentStateShared::Success);

        let ckbtc_balance_after = receiver_ckbtc_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_balance_after,
            ckbtc_balance_before + Nat::from(5_000_000u64),
            "Receiver ckBTC balance should increase by one receive amount"
        );

        let link_account = link_id_to_account(&receiver_fixture.ctx, &link_id);
        let link_balance = receiver_ckbtc_ledger_client
            .balance_of(&link_account)
            .await
            .unwrap();
        assert_eq!(
            link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                Nat::from(5_000_000u64),
                ckbtc_fee,
                max_use_count - 1,
            ),
            "Link balance should have enough amount for remaining uses"
        );

        let link_detail_result = receiver_fixture
            .get_link_details_v3(
                &link_id,
                Some(GetLinkOptions {
                    action_type: ActionType::Receive,
                }),
            )
            .await;
        assert!(link_detail_result.is_ok());
        let link_detail = link_detail_result.unwrap();
        assert_eq!(link_detail.link_user_state, Some(LinkUserState::Completed));

        Ok(())
    })
    .await
    .unwrap();
}
