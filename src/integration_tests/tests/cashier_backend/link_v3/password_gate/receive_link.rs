// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{error::CanisterError, link_v3::dto::action::CreateActionInputV3};
use gate_service_types::GateKey;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, password_gate::fixture::activated_password_gate_link_fixture,
    },
    utils::{principal::TestUser, with_pocket_ic_context},
};

/// Helper: build a Receive action input for the given link and receiver.
fn receive_input(
    fixture: &LinkTestFixtureV3,
    link_id: &str,
    receiver: Principal,
) -> CreateActionInputV3 {
    CreateActionInputV3 {
        link_id: link_id.to_string(),
        action: fixture.receive_action(link_id.to_string(), receiver),
    }
}

#[tokio::test]
async fn it_should_fail_create_action_if_gate_not_opened() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange — activated gated link
        let (creator_fixture, link_id, _gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act — receiver has NOT opened the gate
        let result = receiver_fixture
            .create_action_v3(receive_input(&receiver_fixture, &link_id, receiver))
            .await;

        // Assert
        assert!(result.is_err());
        assert!(
            matches!(result, Err(CanisterError::Unauthorized(_))),
            "expected Unauthorized for receiver with closed gate, got {:?}",
            result
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_create_action_for_creator_even_if_gate_not_opened() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange — creator is TestUser::User1 (set by fixture)
        let (creator_fixture, link_id, _gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let creator = TestUser::User1.get_principal();

        // Act — creator calls create_action (Receive type) without opening the gate.
        // A Receive action is the only valid action type for an active link; using the
        // creator principal means the gate check is skipped before the action is processed.
        let result = creator_fixture
            .create_action_v3(receive_input(&creator_fixture, &link_id, creator))
            .await;

        // Assert — creator is not blocked by Unauthorized (gate check bypassed).
        // The action may still fail for other business reasons, but must not be Unauthorized.
        assert!(
            !matches!(
                result,
                Err(cashier_backend_types::error::CanisterError::Unauthorized(_))
            ),
            "creator should not get Unauthorized from gate check, got {:?}",
            result
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_create_action_after_opening_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "open_says_me").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Open the gate first
        receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                GateKey::Password("open_says_me".to_string()),
            )
            .await
            .expect("gate should open with correct password");

        // Act — now create_action should succeed
        let result = receiver_fixture
            .create_action_v3(receive_input(&receiver_fixture, &link_id, receiver))
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "create_action should succeed after gate is open, got {:?}",
            result
        );

        Ok(())
    })
    .await
    .unwrap();
}
