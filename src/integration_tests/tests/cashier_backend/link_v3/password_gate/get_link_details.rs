// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use gate_service_types::{GateKey, GateStatus};
use std::sync::Arc;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3,
        password_gate::fixture::{PasswordGateLinkFixture, activated_password_gate_link_fixture},
    },
    constant::ICP_TOKEN,
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_return_gates_for_gated_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange — activated link with a password gate
        let (fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "opensesame").await;

        // Act — creator queries link details
        let result = fixture
            .get_link_details_v3_extended(&link_id, None)
            .await
            .expect("get_link_details_v3_extended should succeed");

        // Assert
        assert_eq!(result.link.id, link_id);
        assert_eq!(result.gates.len(), 1);
        let gate_for_user = &result.gates[0];
        assert_eq!(gate_for_user.gate.id, gate.id);
        assert_eq!(
            gate_for_user.gate.key,
            GateKey::PasswordRedacted,
            "key must be redacted"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_return_empty_gates_for_ungated_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange — regular (ungated) tip link
        let creator = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();

        let mut fixture = PasswordGateLinkFixture::new(
            Arc::new(ctx.clone()),
            creator,
            ICP_TOKEN,
            Nat::from(500_000u64),
            icp_fee.clone(),
            icp_fee.clone(),
            "",
        )
        .await;
        fixture.airdrop().await;
        let link_fixture = LinkTestFixtureV3::new(Arc::new(ctx.clone()), creator, icp_fee).await;
        let input = fixture.tip_link_input().unwrap();
        let create_result = link_fixture.create_link_v3(input).await;

        // Act
        let result = link_fixture
            .get_link_details_v3_extended(&create_result.link.id, None)
            .await
            .expect("should succeed");

        // Assert
        assert_eq!(result.gates.len(), 0);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_show_gate_open_status_after_opening() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "letmein").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Before opening: gate_user_status should be None or Closed
        let before = receiver_fixture
            .get_link_details_v3_extended(&link_id, None)
            .await
            .unwrap();
        let gate_before = &before.gates[0];
        let status_before = gate_before.gate_user_status.as_ref().map(|s| &s.status);
        assert!(
            status_before.is_none() || status_before == Some(&GateStatus::Closed),
            "gate should not be open before unlocking"
        );

        // Open the gate
        receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("letmein".to_string()))
            .await
            .expect("open_link_gate should succeed with correct password");

        // After opening: gate_user_status should be Open
        let after = receiver_fixture
            .get_link_details_v3_extended(&link_id, None)
            .await
            .unwrap();
        let gate_after = &after.gates[0];
        assert!(gate_after.gate_user_status.is_some());
        assert_eq!(
            gate_after.gate_user_status.as_ref().unwrap().status,
            GateStatus::Open
        );

        Ok(())
    })
    .await
    .unwrap();
}
