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
        send_tip::fixture::{activate_tip_link_v3_fixture, create_tip_linkv3_fixture},
    },
    constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN},
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_fail_receive_icp_token_tip_link_if_link_not_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            creator,
            token,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let receiver = TestUser::User2.get_principal();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let receive_action = receiver_fixture.receive_action(link_id.clone(), creator);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: receive_action,
        };
        let create_action_result = receiver_fixture.create_action_v3(create_action_input).await;

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
async fn it_should_succeed_receive_icp_token_tip_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            token,
            tip_amount.clone(),
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let receiver = TestUser::User2.get_principal();
        let receiver_fixture = LinkTestFixtureV3::new(
            creator_fixture.ctx.clone(),
            receiver,
            creator_fixture.icp_ledger_fee.clone(),
        )
        .await;

        let receiver_account = Account {
            owner: receiver,
            subaccount: None,
        };

        let icp_ledger_client = ctx.new_icp_ledger_client(receiver);
        let icp_balance_before = icp_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let receive_action = receiver_fixture.receive_action(link_id.clone(), receiver);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: receive_action,
        };
        let create_action_result = receiver_fixture.create_action_v3(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();

        assert!(!create_action_result.action.id.is_empty());
        assert_eq!(
            create_action_result.action.action_type,
            ActionTypeShared::Receive
        );
        assert_eq!(create_action_result.action.intents.len(), 1);
        assert_eq!(create_action_result.action.creator, receiver);

        // Assert Intent1: TransferLinkToWallet
        let intent1 = &create_action_result.action.intents[0];
        assert_eq!(intent1.intent_state, IntentStateShared::Created);
        assert_eq!(intent1.source_address_type, AddressTypeShared::Link);
        assert_eq!(intent1.dest_address_type, AddressTypeShared::User);
        assert_eq!(intent1.dest_address, receiver);
        assert_eq!(intent1.amount, tip_amount);

        // Act: process RECEIVE action
        let process_action_input = ProcessActionInputV3 {
            action_id: create_action_result.action.id.clone(),
        };
        let process_action_result = receiver_fixture
            .process_action_v3(process_action_input)
            .await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();

        let link = process_action_result.link;
        assert_eq!(link.max_use, 1);
        assert_eq!(link.use_count, 1);
        assert_eq!(link.link_state, LinkStateShared::Ended);
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));

        let action = process_action_result.action;
        assert_eq!(action.action_state, ActionStateShared::Success);
        let intents = action.intents;
        assert_eq!(intents.len(), 1);
        let intent1 = &intents[0];
        assert_eq!(intent1.intent_state, IntentStateShared::Success);

        // Assert: receiver's ICP balance increased
        let icp_balance_after = icp_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        assert_eq!(
            icp_balance_after,
            icp_balance_before + tip_amount,
            "Receiver's ICP balance should increase by tip amount"
        );

        // Assert: link's account balance is zero
        let link_account = link_id_to_account(&receiver_fixture.ctx, &link_id);
        let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance,
            Nat::from(0u64),
            "Link balance should be equal to zero"
        );

        // Act: get current user state
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
        let link_user_state = link_detail.link_user_state;
        assert_eq!(link_user_state, Some(LinkUserState::Completed));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_receive_icrc_token_tip_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            token,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let receiver = TestUser::User2.get_principal();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;

        let receiver_account = Account {
            owner: receiver,
            subaccount: None,
        };

        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();

        // Act: create RECEIVE action
        let link_id = create_link_result.link.id.clone();
        let receive_action = receiver_fixture.receive_action(link_id.clone(), receiver);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: receive_action,
        };
        let create_action_result = receiver_fixture.create_action_v3(create_action_input).await;

        assert!(create_action_result.is_ok());
        let create_action_result = create_action_result.unwrap();
        assert!(!create_action_result.action.id.is_empty());
        assert_eq!(
            create_action_result.action.action_type,
            ActionTypeShared::Receive
        );
        assert_eq!(create_action_result.action.intents.len(), 1);
        assert_eq!(create_action_result.action.creator, receiver);

        // Assert Intent1: TransferLinkToWallet
        let intent1 = &create_action_result.action.intents[0];
        assert_eq!(intent1.intent_state, IntentStateShared::Created);
        assert_eq!(intent1.source_address_type, AddressTypeShared::Link);
        assert_eq!(intent1.dest_address_type, AddressTypeShared::User);
        assert_eq!(intent1.dest_address, receiver);
        assert_eq!(intent1.amount, tip_amount);

        // Act: process RECEIVE action
        let process_action_input = ProcessActionInputV3 {
            action_id: create_action_result.action.id.clone(),
        };
        let process_action_result = receiver_fixture
            .process_action_v3(process_action_input)
            .await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link = process_action_result.link;
        assert_eq!(link.max_use, 1);
        assert_eq!(link.use_count, 1);
        assert_eq!(link.link_state, LinkStateShared::Ended);
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));

        let action = process_action_result.action;
        assert_eq!(action.action_state, ActionStateShared::Success);
        let intents = action.intents;
        assert_eq!(intents.len(), 1);
        let intent1 = &intents[0];
        assert_eq!(intent1.intent_state, IntentStateShared::Success);

        // Assert: receiver's ICP balance increased
        let ckbtc_balance_after = ckbtc_ledger_client
            .balance_of(&receiver_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_balance_after,
            ckbtc_balance_before + tip_amount,
            "Receiver ckBTC balance should increase by tip amount"
        );

        // Assert: link's account balance is zero
        let link_account = link_id_to_account(&receiver_fixture.ctx, &link_id);
        let link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance,
            Nat::from(0u64),
            "Link balance should be equal to zero"
        );

        // Act: get current user state
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
        let link_user_state = link_detail.link_user_state;
        assert_eq!(link_user_state, Some(LinkUserState::Completed));

        Ok(())
    })
    .await
    .unwrap();
}
