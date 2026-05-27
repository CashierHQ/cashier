// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::link_v3::dto::link::{CreateLinkInputV3, CreateLinkWithGateResponseV3};
use cashier_shared::types::LinkType as LinkTypeShared;
use gate_service_types::{Gate, GateKey};
use std::sync::Arc;

use crate::{
    cashier_backend::link_v3::fixture::LinkTestFixtureV3,
    constant::ICP_TOKEN,
    utils::{PocketIcTestContext, principal::TestUser},
};

pub struct PasswordGateLinkFixture {
    pub creator: Principal,
    pub token: String,
    pub amount: Nat,
    pub token_fee: Nat,
    pub password: String,
    pub link_fixture: LinkTestFixtureV3,
}

impl PasswordGateLinkFixture {
    pub async fn new(
        ctx: Arc<PocketIcTestContext>,
        creator: Principal,
        token: &str,
        amount: Nat,
        token_fee: Nat,
        icp_ledger_fee: Nat,
        password: &str,
    ) -> Self {
        let link_fixture = LinkTestFixtureV3::new(Arc::clone(&ctx), creator, icp_ledger_fee).await;

        Self {
            creator,
            token: token.to_string(),
            amount,
            token_fee,
            password: password.to_string(),
            link_fixture,
        }
    }

    /// Creates a gated tip link with a single password gate.
    /// Returns the full response including the created gate.
    pub async fn create_link(&self) -> CreateLinkWithGateResponseV3 {
        let input = self.tip_link_input().unwrap();
        self.link_fixture
            .create_link_v3_with_gates(input, vec![GateKey::Password(self.password.clone())])
            .await
            .expect("create_link_v3_with_gates should succeed")
    }

    /// Airdrops enough ICP (and optionally the tip token) to cover fees and the tip amount.
    pub async fn airdrop(&mut self) {
        let initial_balance = Nat::from(1_000_000_000u64);
        let mut lf = self.link_fixture.clone();
        lf.airdrop_icp(initial_balance.clone(), &self.creator).await;
        if self.token != ICP_TOKEN {
            lf.airdrop_icrc(&self.token, initial_balance, &self.creator)
                .await;
        }
    }

    /// Creates the ICRC-2 tip link input action.
    pub fn tip_link_input(&self) -> Result<CreateLinkInputV3, String> {
        let create_action = self.link_fixture.create_action_from_tokens_and_amount(
            self.creator,
            vec![self.token.clone()],
            vec![self.amount.clone()],
            vec![self.token_fee.clone()],
        )?;

        Ok(CreateLinkInputV3 {
            title: "Gated Tip Link".to_string(),
            link_type: LinkTypeShared::SendTip,
            max_use: 3,
            action: create_action,
        })
    }
}

/// Creates and activates a gated tip link, returning the fixture and the created gate.
/// The link will be in `Active` state after this call.
pub async fn activated_password_gate_link_fixture(
    ctx: &PocketIcTestContext,
    password: &str,
) -> (LinkTestFixtureV3, String, Gate) {
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
        password,
    )
    .await;

    fixture.airdrop().await;
    let create_response = fixture.create_link().await;
    assert_eq!(create_response.gates.len(), 1);
    let gate = create_response.gates[0].clone();
    let link_id = create_response.link.id.clone();
    let action_id = create_response.action.id.clone();

    // Execute ICRC-112 approvals and activate the link
    let icrc112_requests = create_response.icrc112_requests.unwrap();
    let _ = crate::utils::icrc_112::execute_icrc112_request(
        &icrc112_requests,
        creator,
        &fixture.link_fixture.ctx,
    )
    .await;

    fixture
        .link_fixture
        .activate_link_v3(&action_id)
        .await
        .expect("activate_link_v3 should succeed");

    (fixture.link_fixture, link_id, gate)
}
