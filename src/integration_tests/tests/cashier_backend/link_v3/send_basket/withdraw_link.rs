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
        fixture::LinkTestFixtureV3,
        send_basket::fixture::activate_basket_link_v3_fixture,
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
async fn it_should_fail_withdraw_basket_link_if_link_active() {
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

        let (test_fixture, activate_link_result) = activate_basket_link_v3_fixture(
            ctx,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = activate_link_result.link.id.clone();
        let withdraw_action = test_fixture.withdraw_action(link_id.clone(), creator);
        let create_action_result = test_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id,
                action: withdraw_action,
            })
            .await;

        // Assert
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
async fn it_should_fail_withdraw_basket_link_if_caller_not_creator() {
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

        let (creator_fixture, activate_link_result) = activate_basket_link_v3_fixture(
            ctx,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;

        let link_id = activate_link_result.link.id.clone();
        let disable_link_result = creator_fixture.disable_link_v3(&link_id).await;
        assert!(disable_link_result.is_ok());
        assert_eq!(disable_link_result.unwrap().link.link_state, LinkStateShared::Inactive);

        let other = test_utils::random_principal_id();
        let other_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), other, icp_fee.clone()).await;

        // Act
        let withdraw_action = other_fixture.withdraw_action(link_id.clone(), other);
        let create_action_result = other_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id,
                action: withdraw_action,
            })
            .await;

        // Assert
        assert!(create_action_result.is_err());
        if let Err(CanisterError::Unauthorized(_)) = create_action_result {
            // expected
        } else {
            panic!("Expected CanisterError::Unauthorized");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_withdraw_basket_link_with_three_tokens() {
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
        let token_fees = vec![icp_fee.clone(), ckbtc_fee.clone(), ckusdc_fee.clone()];

        let (test_fixture, activate_link_result) = activate_basket_link_v3_fixture(
            ctx,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;

        let creator_account = Account {
            owner: creator,
            subaccount: None,
        };
        let link_id = activate_link_result.link.id.clone();
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);

        let icp_creator_before = icp_ledger_client.balance_of(&creator_account).await.unwrap();
        let ckbtc_creator_before = ckbtc_ledger_client
            .balance_of(&creator_account)
            .await
            .unwrap();
        let ckusdc_creator_before = ckusdc_ledger_client
            .balance_of(&creator_account)
            .await
            .unwrap();

        let icp_link_before = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let ckbtc_link_before = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckusdc_link_before = ckusdc_ledger_client.balance_of(&link_account).await.unwrap();

        let icp_withdraw = if icp_link_before > icp_fee {
            icp_link_before.clone() - icp_fee.clone()
        } else {
            Nat::from(0u64)
        };
        let ckbtc_withdraw = if ckbtc_link_before > ckbtc_fee {
            ckbtc_link_before.clone() - ckbtc_fee.clone()
        } else {
            Nat::from(0u64)
        };
        let ckusdc_withdraw = if ckusdc_link_before > ckusdc_fee {
            ckusdc_link_before.clone() - ckusdc_fee.clone()
        } else {
            Nat::from(0u64)
        };

        // Act: disable link first (required for withdraw)
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;
        assert!(disable_link_result.is_ok());
        assert_eq!(disable_link_result.unwrap().link.link_state, LinkStateShared::Inactive);

        // Act: create withdraw action
        let withdraw_action = test_fixture.withdraw_action(link_id.clone(), creator);
        let create_action_result = test_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: withdraw_action,
            })
            .await;

        // Assert create action
        assert!(create_action_result.is_ok());
        let action = create_action_result.unwrap().action;
        let action_id = action.id.clone();
        assert!(!action_id.is_empty());
        assert_eq!(action.action_type, ActionTypeShared::Withdraw);
        assert_eq!(action.intents.len(), 3);
        for intent in &action.intents {
            assert_eq!(intent.intent_state, IntentStateShared::Created);
            assert_eq!(intent.source_address_type, AddressTypeShared::Link);
            assert_eq!(intent.dest_address_type, AddressTypeShared::User);
            assert_eq!(intent.dest_address, creator);
        }

        // Act: process withdraw action
        let process_action_result = test_fixture
            .process_action_v3(ProcessActionInputV3 { action_id })
            .await;

        // Assert process
        assert!(process_action_result.is_ok());
        let process_action_result = process_action_result.unwrap();
        assert_eq!(process_action_result.link.link_state, LinkStateShared::Ended);
        assert_eq!(
            process_action_result.action.action_state,
            ActionStateShared::Success
        );

        // Assert creator balances increase by withdraw amounts
        let icp_creator_after = icp_ledger_client.balance_of(&creator_account).await.unwrap();
        let ckbtc_creator_after = ckbtc_ledger_client
            .balance_of(&creator_account)
            .await
            .unwrap();
        let ckusdc_creator_after = ckusdc_ledger_client
            .balance_of(&creator_account)
            .await
            .unwrap();
        assert_eq!(icp_creator_after, icp_creator_before + icp_withdraw);
        assert_eq!(ckbtc_creator_after, ckbtc_creator_before + ckbtc_withdraw);
        assert_eq!(ckusdc_creator_after, ckusdc_creator_before + ckusdc_withdraw);

        // Assert link balances become zero
        assert_eq!(
            icp_ledger_client.balance_of(&link_account).await.unwrap(),
            Nat::from(0u64)
        );
        assert_eq!(
            ckbtc_ledger_client.balance_of(&link_account).await.unwrap(),
            Nat::from(0u64)
        );
        assert_eq!(
            ckusdc_ledger_client.balance_of(&link_account).await.unwrap(),
            Nat::from(0u64)
        );

        Ok(())
    })
    .await
    .unwrap();
}
