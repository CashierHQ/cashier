// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::link_v3::dto::{
    action::ProcessActionResponseV3,
    link::{CreateLinkInputV3, CreateLinkResponseV3},
};
use cashier_shared::types::LinkType as LinkTypeShared;
use std::sync::Arc;

use crate::{
    cashier_backend::link_v3::fixture::LinkTestFixtureV3,
    constant::ICP_TOKEN,
    utils::{PocketIcTestContext, icrc_112, principal::TestUser},
};

pub struct AirdropLinkV3Fixture {
    pub caller: Principal,
    pub token: String,
    pub amount: Nat,
    pub max_use_count: u64,
    pub token_fee: Nat,
    pub link_fixture: LinkTestFixtureV3,
}

impl AirdropLinkV3Fixture {
    pub async fn new(
        ctx: Arc<PocketIcTestContext>,
        caller: Principal,
        token: &str,
        amount: Nat,
        max_use_count: u64,
        token_fee: Nat,
        icp_ledger_fee: Nat,
    ) -> Self {
        let link_fixture =
            LinkTestFixtureV3::new(Arc::clone(&ctx), caller, icp_ledger_fee.clone()).await;

        Self {
            caller,
            token: token.to_string(),
            amount,
            max_use_count,
            token_fee,
            link_fixture,
        }
    }

    /// This function creates an airdrop link v3.
    pub async fn create_link(&self) -> CreateLinkResponseV3 {
        self.link_fixture
            .create_link_v3(self.airdrop_link_input().unwrap())
            .await
    }

    /// This function activates an airdrop link v3.
    pub async fn activate_link(&mut self) -> ProcessActionResponseV3 {
        let create_link_result = self.create_link().await;
        let action_id = create_link_result.action.id.clone();

        self.airdrop_icp_and_asset().await;

        // Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let _icrc112_execution_result = icrc_112::execute_icrc112_request(
            &icrc_112_requests,
            self.caller,
            &self.link_fixture.ctx,
        )
        .await;

        self.link_fixture.activate_link_v3(&action_id).await.unwrap()
    }

    /// Creates the input for an airdrop link.
    pub fn airdrop_link_input(&self) -> Result<CreateLinkInputV3, String> {
        let create_action = self.link_fixture.create_action_from_tokens_and_amount(
            self.caller,
            vec![self.token.to_string()],
            vec![self.amount.clone()],
            vec![self.token_fee.clone()],
        )?;

        Ok(CreateLinkInputV3 {
            title: "Test Airdrop Link".to_string(),
            link_type: LinkTypeShared::SendAirdrop,
            max_use: self.max_use_count,
            action: create_action,
        })
    }

    /// Airdrop ICP and asset to creator wallet.
    pub async fn airdrop_icp_and_asset(&mut self) {
        let initial_balance = Nat::from(1_000_000_000u64);
        let mut link_fixture = self.link_fixture.clone();

        link_fixture
            .airdrop_icp(initial_balance.clone(), &self.caller)
            .await;

        if self.token != ICP_TOKEN {
            link_fixture
                .airdrop_icrc(&self.token, initial_balance.clone(), &self.caller)
                .await;
        }
    }
}

/// Creates a fixture for an airdrop link v3.
#[allow(dead_code)]
pub async fn create_airdrop_link_v3_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    token: &str,
    amount: Nat,
    max_use_count: u64,
    token_fee: Nat,
    icp_ledger_fee: Nat,
) -> (LinkTestFixtureV3, CreateLinkResponseV3) {
    let mut creator_fixture = AirdropLinkV3Fixture::new(
        Arc::new(ctx.clone()),
        creator,
        token,
        amount.clone(),
        max_use_count,
        token_fee.clone(),
        icp_ledger_fee.clone(),
    )
    .await;

    creator_fixture.airdrop_icp_and_asset().await;

    let link_response = creator_fixture.create_link().await;
    (creator_fixture.link_fixture, link_response)
}

/// Activate an airdrop link v3 fixture.
pub async fn activate_airdrop_link_v3_fixture(
    ctx: &PocketIcTestContext,
    token: &str,
    amount: Nat,
    max_use_count: u64,
    token_fee: Nat,
    icp_ledger_fee: Nat,
) -> (LinkTestFixtureV3, ProcessActionResponseV3) {
    let creator = TestUser::User1.get_principal();
    let mut creator_fixture = AirdropLinkV3Fixture::new(
        Arc::new(ctx.clone()),
        creator,
        token,
        amount.clone(),
        max_use_count,
        token_fee.clone(),
        icp_ledger_fee.clone(),
    )
    .await;

    let activate_link_result = creator_fixture.activate_link().await;
    (creator_fixture.link_fixture, activate_link_result)
}
