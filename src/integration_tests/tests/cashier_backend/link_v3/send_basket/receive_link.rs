// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::action::{CreateActionInputV3, ProcessActionInputV3},
    repository::{action::v1::ActionType, link_action::v1::LinkUserState},
};
use cashier_shared::types::{
    ActionState as ActionStateShared, ActionType as ActionTypeShared,
    AddressType as AddressTypeShared, IntentState as IntentStateShared,
    LinkState as LinkStateShared,
};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3,
        send_basket::fixture::{activate_basket_link_v3_fixture, create_basket_link_v3_fixture},
    },
    constant::{CKBTC_ICRC_TOKEN, CKUSDC_ICRC_TOKEN, ICP_TOKEN},
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

fn fixture_of_three_tokens() -> (Vec<String>, Vec<Nat>) {
    (
        vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ],
        vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ],
    )
}

#[tokio::test]
async fn it_should_fail_receive_basket_link_if_link_not_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: basket always contains ICP + ckBTC + ckUSDC
        let creator = TestUser::User1.get_principal();
        let (tokens, amounts) = fixture_of_three_tokens();
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];
        let (creator_fixture, create_link_result) = create_basket_link_v3_fixture(
            ctx,
            creator,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;

        let receiver = TestUser::User2.get_principal();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let receive_action = receiver_fixture.receive_action(link_id.clone(), receiver);
        let create_action_result = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id,
                action: receive_action,
            })
            .await;

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
async fn it_should_fail_receive_basket_link_if_requested_more_than_once() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: basket always contains ICP + ckBTC + ckUSDC
        let creator = TestUser::User1.get_principal();
        let receiver1 = TestUser::User2.get_principal();
        let receiver2 = TestUser::User3.get_principal();
        let (tokens, amounts) = fixture_of_three_tokens();
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];
        let (creator_fixture, activate_link_result) =
            activate_basket_link_v3_fixture(ctx, tokens, amounts, token_fees, icp_fee.clone())
                .await;

        let link_id = activate_link_result.link.id.clone();
        let receiver1_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver1, icp_fee.clone()).await;
        let receiver2_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver2, icp_fee.clone()).await;

        // Act: first receive
        let first_action = receiver1_fixture.receive_action(link_id.clone(), receiver1);
        let first_create_result = receiver1_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: first_action,
            })
            .await;
        assert!(first_create_result.is_ok());
        let first_process_result = receiver1_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: first_create_result.unwrap().action.id,
            })
            .await;
        assert!(first_process_result.is_ok());

        // Act: second receive should fail (link already ended)
        let second_action = receiver2_fixture.receive_action(link_id.clone(), receiver2);
        let second_create_result = receiver2_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id,
                action: second_action,
            })
            .await;

        // Assert
        assert!(second_create_result.is_err());
        if let Err(err) = second_create_result {
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
async fn it_should_succeed_receive_basket_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: basket always contains ICP + ckBTC + ckUSDC
        let creator = TestUser::User1.get_principal();
        let receiver = TestUser::User2.get_principal();
        let (tokens, amounts) = fixture_of_three_tokens();
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];
        let (creator_fixture, activate_link_result) =
            activate_basket_link_v3_fixture(ctx, tokens, amounts.clone(), token_fees, icp_fee)
                .await;

        let receiver_icp_ledger_client = ctx.new_icp_ledger_client(receiver);
        let receiver_icp_fee = receiver_icp_ledger_client.fee().await.unwrap_or_default();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, receiver_icp_fee)
                .await;
        let receiver_account = Account {
            owner: receiver,
            subaccount: None,
        };

        let receiver_ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, receiver);
        let receiver_ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, receiver);

        let icp_before = receiver_icp_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        let ckbtc_before = receiver_ckbtc_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        let ckusdc_before = receiver_ckusdc_ledger_client
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

        // Assert create action
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.action.id.is_empty());
        assert_eq!(
            create_action_result.action.action_type,
            ActionTypeShared::Receive
        );
        assert_eq!(create_action_result.action.intents.len(), 3);
        assert_eq!(create_action_result.action.creator, receiver);
        for intent in &create_action_result.action.intents {
            assert_eq!(intent.intent_state, IntentStateShared::Created);
            assert_eq!(intent.source_address_type, AddressTypeShared::Link);
            assert_eq!(intent.dest_address_type, AddressTypeShared::User);
            assert_eq!(intent.dest_address, receiver);
        }

        // Act process
        let process_action_result = receiver_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: create_action_result.action.id.clone(),
            })
            .await;

        // Assert process
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link = process_action_result.link;
        assert_eq!(link.max_use, 1);
        assert_eq!(link.use_count, 1);
        assert_eq!(link.link_state, LinkStateShared::Ended);
        let action = process_action_result.action;
        assert_eq!(action.action_state, ActionStateShared::Success);
        assert_eq!(action.intents.len(), 3);
        for intent in action.intents {
            assert_eq!(intent.intent_state, IntentStateShared::Success);
        }

        // Assert balances of all three tokens
        let icp_after = receiver_icp_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        let ckbtc_after = receiver_ckbtc_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        let ckusdc_after = receiver_ckusdc_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        assert_eq!(icp_after, icp_before + amounts[0].clone());
        assert_eq!(ckbtc_after, ckbtc_before + amounts[1].clone());
        assert_eq!(ckusdc_after, ckusdc_before + amounts[2].clone());

        // Assert link account balances are zero
        let link_account = link_id_to_account(&receiver_fixture.ctx, &link_id);
        assert_eq!(
            receiver_icp_ledger_client
                .balance_of(&link_account)
                .await
                .unwrap(),
            Nat::from(0u64)
        );
        assert_eq!(
            receiver_ckbtc_ledger_client
                .balance_of(&link_account)
                .await
                .unwrap(),
            Nat::from(0u64)
        );
        assert_eq!(
            receiver_ckusdc_ledger_client
                .balance_of(&link_account)
                .await
                .unwrap(),
            Nat::from(0u64)
        );

        // Assert link user state
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
