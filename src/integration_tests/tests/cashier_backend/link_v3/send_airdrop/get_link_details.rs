// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    dto::link::GetLinkOptions, error::CanisterError, repository::action::v1::ActionType,
};
use cashier_shared::types::{
    ActionState as ActionStateShared, IntentState as IntentStateShared,
    LinkState as LinkStateShared,
};

use crate::{
    cashier_backend::link_v3::send_airdrop::fixture::activate_airdrop_link_v3_fixture,
    constant::ICP_TOKEN,
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_fail_get_airdrop_link_details_if_link_not_found() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 10;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, _create_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = "non_existent_link_id".to_string();
        let get_links_result = test_fixture.get_link_details_v3(&link_id, None).await;

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
async fn it_should_succeed_get_airdrop_link_details_with_no_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 10;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = create_link_result.link.id;
        let get_links_result = test_fixture.get_link_details_v3(&link_id, None).await;

        // Assert
        assert!(get_links_result.is_ok());
        let link = get_links_result.unwrap().link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.link_state, LinkStateShared::Active);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_link_details_with_create_action_succeeded() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 10;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = create_link_result.link.id;
        let option = GetLinkOptions {
            action_type: ActionType::CreateLink,
        };
        let get_links_result = test_fixture
            .get_link_details_v3(&link_id, Some(option))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let get_link_result = get_links_result.unwrap();
        let link = get_link_result.link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.link_state, LinkStateShared::Active);
        let action = get_link_result.action.unwrap();
        assert_eq!(action.action_state, ActionStateShared::Success);
        assert_eq!(action.intents.len(), 2);
        let intent0 = &action.intents[0];
        assert_eq!(intent0.intent_state, IntentStateShared::Success);
        let intent1 = &action.intents[1];
        assert_eq!(intent1.intent_state, IntentStateShared::Success);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_link_details_with_option_action_not_existent() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 10;
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            airdrop_amount,
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = create_link_result.link.id;
        let option = GetLinkOptions {
            action_type: ActionType::Receive,
        };
        let get_links_result = test_fixture
            .get_link_details_v3(&link_id, Some(option))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let get_link_result = get_links_result.unwrap();
        let link = get_link_result.link;
        assert_eq!(link.id, link_id);
        assert_eq!(link.link_state, LinkStateShared::Active);
        assert!(get_link_result.action.is_none());

        Ok(())
    })
    .await
    .unwrap();
}
