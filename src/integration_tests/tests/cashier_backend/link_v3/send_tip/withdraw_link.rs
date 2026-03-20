// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::dto::action::{CreateActionInputV3, ProcessActionInputV3},
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
        fixture::LinkTestFixtureV3, send_tip::fixture::activate_tip_link_v3_fixture,
    },
    constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN},
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_withdraw_icp_token_tip_link_error_if_link_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act: create WITHDRAW action
        let link_id = create_link_result.link.id.clone();
        let withdraw_action = test_fixture.withdraw_action(link_id.clone(), creator);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: withdraw_action,
        };
        let create_action_result = test_fixture.create_action_v3(create_action_input).await;

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
async fn it_should_error_when_non_creator_create_withdraw_action_tip_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: creator creates and then disables the tip link
        let creator = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;
        assert!(disable_link_result.is_ok());
        let link = disable_link_result.unwrap().link;
        assert_eq!(link.link_state, LinkStateShared::Inactive);

        // Act: another identity attempts to create a WITHDRAW action -> should error
        let other = test_utils::random_principal_id();
        let other_fixture =
            LinkTestFixtureV3::new(test_fixture.ctx.clone(), other, icp_fee.clone()).await;
        let withdraw_action = other_fixture.withdraw_action(link_id.clone(), other);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: withdraw_action,
        };
        let create_action_result = other_fixture.create_action_v3(create_action_input).await;

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
async fn it_should_withdraw_icp_token_tip_link_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount.clone(),
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let creator_account = Account {
            owner: creator,
            subaccount: None,
        };
        let icp_balance_before = icp_ledger_client
            .balance_of(&creator_account)
            .await
            .unwrap();
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);
        let link_balance_before = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let withdraw_balance = if link_balance_before > icp_fee {
            link_balance_before - icp_fee
        } else {
            Nat::from(0u64)
        };

        // Act: disable the link first to make it Inactive
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;

        assert!(disable_link_result.is_ok());
        let link = disable_link_result.unwrap().link;
        assert_eq!(link.link_state, LinkStateShared::Inactive);

        // Act: create WITHDRAW action
        let link_id = create_link_result.link.id.clone();
        let withdraw_action = test_fixture.withdraw_action(link_id.clone(), creator);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: withdraw_action,
        };
        let create_action_result = test_fixture.create_action_v3(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let action = create_action_result.unwrap().action;
        let action_id = action.id.clone();
        assert!(!action_id.is_empty());
        assert_eq!(action.action_type, ActionTypeShared::Withdraw);
        assert_eq!(action.intents.len(), 1);

        // Assert Intent 1: TransferLinkToWallet
        let intent1 = &action.intents[0];
        assert_eq!(intent1.intent_state, IntentStateShared::Created);
        assert_eq!(intent1.source_address_type, AddressTypeShared::Link);
        assert_eq!(intent1.dest_address_type, AddressTypeShared::Creator);
        assert_eq!(intent1.dest_address, creator);
        assert_eq!(intent1.amount, tip_amount);

        // Act: process WITHDRAW action
        let process_action_input = ProcessActionInputV3 {
            action_id: action_id.clone(),
        };
        let process_action_result = test_fixture.process_action_v3(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link = process_action_result.link;
        assert_eq!(link.link_state, LinkStateShared::Ended);
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));
        let action = process_action_result.action;
        assert_eq!(action.action_state, ActionStateShared::Success);

        // Assert: creator balance increased
        let icp_balance_after = icp_ledger_client
            .balance_of(&creator_account)
            .await
            .unwrap();
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
async fn it_should_withdraw_icrc_token_tip_link_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let tip_amount = Nat::from(5_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, creator);
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            CKBTC_ICRC_TOKEN,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let creator_account = Account {
            owner: creator,
            subaccount: None,
        };
        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&creator_account)
            .await
            .unwrap();
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);
        let link_balance_before = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let withdraw_balance = if link_balance_before > ckbtc_fee {
            link_balance_before - ckbtc_fee
        } else {
            Nat::from(0u64)
        };

        // Act: disable the link first to make it Inactive
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;

        assert!(disable_link_result.is_ok());
        let link = disable_link_result.unwrap().link;
        assert_eq!(link.link_state, LinkStateShared::Inactive);

        // Act: create WITHDRAW action
        let link_id = create_link_result.link.id.clone();
        let withdraw_action = test_fixture.withdraw_action(link_id.clone(), creator);
        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: withdraw_action,
        };
        let create_action_result = test_fixture.create_action_v3(create_action_input).await;

        // Assert: action created successfully
        assert!(create_action_result.is_ok());
        let action = create_action_result.unwrap().action;
        let action_id = action.id.clone();
        assert!(!action_id.is_empty());
        assert_eq!(action.action_type, ActionTypeShared::Withdraw);
        assert_eq!(action.intents.len(), 1);

        // Assert Intent 1: TransferLinkToWallet
        let intent1 = &action.intents[0];
        assert_eq!(intent1.intent_state, IntentStateShared::Created);
        assert_eq!(intent1.source_address_type, AddressTypeShared::Link);
        assert_eq!(intent1.dest_address_type, AddressTypeShared::Creator);
        assert_eq!(intent1.dest_address, creator);
        assert_eq!(intent1.amount, tip_amount);

        // Act: process WITHDRAW action
        let process_action_input = ProcessActionInputV3 {
            action_id: action_id.clone(),
        };
        let process_action_result = test_fixture.process_action_v3(process_action_input).await;

        // Assert: action processed successfully
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        let link = process_action_result.link;
        assert_eq!(link.link_state, LinkStateShared::Ended);
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));
        let action = process_action_result.action;
        assert_eq!(action.action_state, ActionStateShared::Success);

        // Assert: creator balance increased
        let ckbtc_balance_after = ckbtc_ledger_client
            .balance_of(&creator_account)
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
