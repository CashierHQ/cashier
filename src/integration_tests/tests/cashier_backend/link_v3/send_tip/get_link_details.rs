// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v3::fixture::LinkTestFixtureV3;
use crate::cashier_backend::link_v3::send_tip::fixture::{
    activate_tip_link_v3_fixture, create_tip_linkv3_fixture,
};
use crate::utils::link_id_to_account::link_id_to_account;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::Nat;
use cashier_backend_types::constant::{FEE_TREASURY_PRINCIPAL, ICP_TOKEN};
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::dto::link::GetLinkOptions;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol};
use cashier_common::constant::CREATE_LINK_FEE;
use cashier_shared::types::{
    ActionState as ActionStateShared, IntentState as IntentStateShared,
    LinkState as LinkStateShared,
};

#[tokio::test]
async fn it_should_fail_get_tip_link_details_if_link_not_found() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, _create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
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
async fn it_should_succeed_get_tip_link_details_with_no_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = Nat::from(1_000_000u64);
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
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
        let tip_amount = Nat::from(1_000_000u64);
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
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
        let tip_amount = Nat::from(1_000_000u64);
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
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

#[tokio::test]
async fn it_should_succeed_get_link_details_with_create_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let initial_action = create_link_result.action.clone();
        assert_eq!(initial_action.action_state, ActionStateShared::Created);
        assert_eq!(initial_action.intents.len(), 2);

        Ok(())
    })
    .await
    .unwrap();
}
