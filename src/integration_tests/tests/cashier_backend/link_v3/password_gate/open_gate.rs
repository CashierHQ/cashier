// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::error::CanisterError;
use gate_service_types::{GateKey, GateStatus};

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, password_gate::fixture::activated_password_gate_link_fixture,
    },
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_fail_open_gate_with_wrong_password() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "correct_password").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act
        let result = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                GateKey::Password("wrong_password".to_string()),
            )
            .await;

        // Assert
        assert!(result.is_err());
        assert!(
            matches!(result, Err(CanisterError::Unauthorized(_))),
            "expected Unauthorized for wrong password, got {:?}",
            result
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_open_gate_with_correct_password() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "my_secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act
        let result = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                GateKey::Password("my_secret".to_string()),
            )
            .await;

        // Assert
        assert!(result.is_ok(), "expected Ok, got {:?}", result);
        let open_result = result.unwrap();
        assert_eq!(open_result.gate.id, gate.id);
        assert_eq!(open_result.gate_user_status.user_id, receiver);
        assert_eq!(open_result.gate_user_status.status, GateStatus::Open);

        Ok(())
    })
    .await
    .unwrap();
}
