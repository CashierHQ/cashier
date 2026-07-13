// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::action::{CreateActionInputV3, ProcessActionInputV3},
    repository::action::v1::ActionType,
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
        let create_action_result = receiver1_fixture
            .create_action_v3(create_action_input)
            .await;
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
                icp_fee.clone(),
                max_use_count - 1,
            ),
            "Link balance should have enough amount for remaining uses"
        );
        assert_eq!(
            link.asset_info[0].available_amount,
            activate_link_result.link.asset_info[0]
                .available_amount
                .clone()
                .map(|available_amount| {
                    available_amount - Nat::from(1_000_000u64) - icp_fee.clone()
                })
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
        assert_eq!(link_detail.actions.len(), 1);
        assert_eq!(
            link_detail.actions[0].action_state,
            ActionStateShared::Success
        );

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
                ckbtc_fee.clone(),
                max_use_count - 1,
            ),
            "Link balance should have enough amount for remaining uses"
        );
        assert_eq!(
            link.asset_info[0].available_amount,
            activate_link_result.link.asset_info[0]
                .available_amount
                .clone()
                .map(|available_amount| {
                    available_amount - Nat::from(5_000_000u64) - ckbtc_fee.clone()
                })
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
        assert_eq!(link_detail.actions.len(), 1);
        assert_eq!(
            link_detail.actions[0].action_state,
            ActionStateShared::Success
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_same_user_to_claim_airdrop_link_multiple_times_while_slots_available() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: an airdrop link with 3 uses, so the same receiver can claim more than once.
        let max_use_count = 3;
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
        let link_id = activate_link_result.link.id.clone();

        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;

        // Act: first claim
        let first_action = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver_fixture.receive_action(link_id.clone(), receiver),
            })
            .await
            .expect("first create action should succeed");
        receiver_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: first_action.action.id.clone(),
            })
            .await
            .expect("first process action should succeed");

        // Act: second claim by the SAME user, while the link still has an available slot.
        // Previously this was impossible: the backend only ever surfaced the user's first
        // action, and the frontend permanently routed them to the Completed page.
        let second_action = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver_fixture.receive_action(link_id.clone(), receiver),
            })
            .await
            .expect("second create action by the same user should succeed");
        receiver_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: second_action.action.id.clone(),
            })
            .await
            .expect("second process action should succeed");

        // Assert: link accounted for exactly two uses.
        let link = receiver_fixture
            .get_link_details_v3(&link_id, None)
            .await
            .unwrap()
            .link;
        assert_eq!(
            link.use_count, 2,
            "two claims by the same user must count as two uses"
        );
        assert_eq!(link.link_state, LinkStateShared::Active);

        // Assert: get_link_details_v3 now surfaces BOTH of the user's claims, not just the first.
        let options = GetLinkOptions {
            action_type: ActionType::Receive,
        };
        let actions = receiver_fixture
            .get_link_details_v3(&link_id, Some(options))
            .await
            .unwrap()
            .actions;
        assert_eq!(
            actions.len(),
            2,
            "both claims must be visible to the claiming user"
        );
        assert!(
            actions
                .iter()
                .all(|a| a.action_state == ActionStateShared::Success),
            "both claims must be Success, got {actions:?}"
        );

        // Assert: receiver was paid twice.
        let receiver_balance = icp_ledger_client
            .balance_of(&Account {
                owner: receiver,
                subaccount: None,
            })
            .await
            .unwrap();
        assert_eq!(
            receiver_balance,
            airdrop_amount * Nat::from(2u64),
            "receiver must be paid for both claims"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_reject_further_claims_by_the_same_user_once_link_is_fully_used() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: an airdrop link with exactly 2 uses, claimed twice by the same user.
        let max_use_count = 2;
        let creator = TestUser::User1.get_principal();
        let receiver = TestUser::User2.get_principal();
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let link_id = activate_link_result.link.id.clone();

        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;

        for _ in 0..2 {
            let action = receiver_fixture
                .create_action_v3(CreateActionInputV3 {
                    link_id: link_id.clone(),
                    action: receiver_fixture.receive_action(link_id.clone(), receiver),
                })
                .await
                .expect("claim within max_use should succeed");
            receiver_fixture
                .process_action_v3(ProcessActionInputV3 {
                    action_id: action.action.id.clone(),
                })
                .await
                .expect("processing a claim within max_use should succeed");
        }

        // Act: a third claim attempt by the SAME user, once the link is fully used.
        let third_create_result = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver_fixture.receive_action(link_id.clone(), receiver),
            })
            .await;

        // Assert: rejected — capacity enforcement is untouched by allowing repeat claims.
        assert!(
            third_create_result.is_err(),
            "a claim once the link is fully used must be rejected"
        );

        let link = receiver_fixture
            .get_link_details_v3(&link_id, None)
            .await
            .unwrap()
            .link;
        assert_eq!(link.use_count, 2, "use_count must not exceed max_use");
        assert_eq!(link.link_state, LinkStateShared::Ended);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_surface_pending_action_with_icrc112_requests_for_resume() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: a claim is created but never processed (simulates a user who
        // closed the tab mid-claim).
        let max_use_count = 3;
        let creator = TestUser::User1.get_principal();
        let receiver = TestUser::User2.get_principal();
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let link_id = activate_link_result.link.id.clone();

        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;

        let created_action = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver_fixture.receive_action(link_id.clone(), receiver),
            })
            .await
            .expect("create action should succeed");

        // Act: fetch link details as the claiming user, without ever processing the action.
        let options = GetLinkOptions {
            action_type: ActionType::Receive,
        };
        let link_detail = receiver_fixture
            .get_link_details_v3(&link_id, Some(options))
            .await
            .expect("get link details should succeed");

        // Assert: the pending action is returned for resume, with icrc112 requests attached.
        assert_eq!(link_detail.actions.len(), 1);
        assert_eq!(link_detail.actions[0].id, created_action.action.id);
        assert_eq!(
            link_detail.actions[0].action_state,
            ActionStateShared::Created
        );
        assert!(
            link_detail.icrc112_requests.is_some(),
            "a pending action must have icrc112_requests to resume"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_reject_creating_a_second_pending_claim_while_one_is_still_pending() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: the receiver has already created (but not processed) a claim.
        let max_use_count = 3;
        let creator = TestUser::User1.get_principal();
        let receiver = TestUser::User2.get_principal();
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let link_id = activate_link_result.link.id.clone();

        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;

        receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver_fixture.receive_action(link_id.clone(), receiver),
            })
            .await
            .expect("first create action should succeed");

        // Act: attempt a second concurrent claim for the same user/link (e.g. two tabs)
        // before the first one is processed.
        let second_create_result = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver_fixture.receive_action(link_id.clone(), receiver),
            })
            .await;

        // Assert
        assert!(
            matches!(
                &second_create_result,
                Err(CanisterError::ValidationErrors(msg)) if msg == "A pending action already exists for this link"
            ),
            "a second pending claim while one is already pending must be rejected, got {second_create_result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}
