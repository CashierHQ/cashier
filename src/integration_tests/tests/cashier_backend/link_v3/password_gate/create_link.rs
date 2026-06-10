// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_shared::types::LinkState as LinkStateShared;
use gate_service_types::GateKey;
use std::sync::Arc;

use crate::{
    cashier_backend::link_v3::password_gate::fixture::PasswordGateLinkFixture,
    constant::ICP_TOKEN,
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_create_tip_link_with_password_gate_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();

        let mut fixture = PasswordGateLinkFixture::new(
            Arc::new(ctx.clone()),
            creator,
            ICP_TOKEN,
            Nat::from(500_000u64),
            icp_fee.clone(),
            icp_fee,
            "secret123",
        )
        .await;
        fixture.airdrop().await;

        // Act
        let result = fixture.create_link().await;

        // Assert — link is created in Created state
        assert!(!result.link.id.is_empty());
        assert_eq!(result.link.link_state, LinkStateShared::Created);

        // Gate is returned with key redacted
        assert_eq!(result.gates.len(), 1);
        let gate = &result.gates[0];
        assert_eq!(gate.subject_id, result.link.id);
        assert_eq!(
            gate.key,
            GateKey::PasswordRedacted,
            "password must be redacted in response"
        );

        Ok(())
    })
    .await
    .unwrap();
}
