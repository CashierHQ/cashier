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

pub struct BasketLinkV3Fixture {
    pub caller: Principal,
    pub tokens: Vec<String>,
    pub amounts: Vec<Nat>,
    pub token_fees: Vec<Nat>,
    pub link_fixture: LinkTestFixtureV3,
}

impl BasketLinkV3Fixture {
    pub async fn new(
        ctx: Arc<PocketIcTestContext>,
        caller: Principal,
        tokens: Vec<String>,
        amounts: Vec<Nat>,
        token_fees: Vec<Nat>,
        icp_ledger_fee: Nat,
    ) -> Self {
        let link_fixture =
            LinkTestFixtureV3::new(Arc::clone(&ctx), caller, icp_ledger_fee.clone()).await;

        Self {
            caller,
            tokens,
            amounts,
            token_fees,
            link_fixture,
        }
    }

    /// This function creates a token basket link v3.
    pub async fn create_link(&self) -> CreateLinkResponseV3 {
        self.link_fixture
            .create_link_v3(self.token_basket_link_input().unwrap())
            .await
    }

    /// This function activates a token basket link v3.
    #[allow(dead_code)]
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

    /// Creates the input for a token basket link.
    pub fn token_basket_link_input(&self) -> Result<CreateLinkInputV3, String> {
        if self.tokens.len() != self.amounts.len() || self.tokens.len() != self.token_fees.len() {
            return Err(format!(
                "Tokens, amounts, and token_fees must have the same length: {} vs {} vs {}",
                self.tokens.len(),
                self.amounts.len(),
                self.token_fees.len()
            ));
        }

        let create_action = self.link_fixture.create_action_from_tokens_and_amount(
            self.caller,
            self.tokens.clone(),
            self.amounts.clone(),
            self.token_fees.clone(),
        )?;

        Ok(CreateLinkInputV3 {
            title: "Test Token Basket Link".to_string(),
            link_type: LinkTypeShared::SendTokenBasket,
            max_use: 1,
            action: create_action,
        })
    }

    /// Airdrop ICP and all non-ICP basket assets to caller wallet.
    pub async fn airdrop_icp_and_asset(&mut self) {
        let initial_balance = Nat::from(1_000_000_000u64);
        let mut link_fixture = self.link_fixture.clone();

        link_fixture
            .airdrop_icp(initial_balance.clone(), &self.caller)
            .await;

        for token in self.tokens.iter() {
            if token == ICP_TOKEN {
                continue;
            }

            link_fixture
                .airdrop_icrc(token, initial_balance.clone(), &self.caller)
                .await;
        }
    }
}

/// Creates a fixture for a token basket link v3.
#[allow(dead_code)]
pub async fn create_basket_link_v3_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    tokens: Vec<String>,
    amounts: Vec<Nat>,
    token_fees: Vec<Nat>,
    icp_ledger_fee: Nat,
) -> (LinkTestFixtureV3, CreateLinkResponseV3) {
    let mut creator_fixture = BasketLinkV3Fixture::new(
        Arc::new(ctx.clone()),
        creator,
        tokens,
        amounts,
        token_fees,
        icp_ledger_fee,
    )
    .await;

    creator_fixture.airdrop_icp_and_asset().await;

    let link_response = creator_fixture.create_link().await;
    (creator_fixture.link_fixture, link_response)
}

/// Activate a token basket link v3 fixture.
#[allow(dead_code)]
pub async fn activate_basket_link_v3_fixture(
    ctx: &PocketIcTestContext,
    tokens: Vec<String>,
    amounts: Vec<Nat>,
    token_fees: Vec<Nat>,
    icp_ledger_fee: Nat,
) -> (LinkTestFixtureV3, ProcessActionResponseV3) {
    let creator = TestUser::User1.get_principal();
    let mut creator_fixture = BasketLinkV3Fixture::new(
        Arc::new(ctx.clone()),
        creator,
        tokens,
        amounts,
        token_fees,
        icp_ledger_fee,
    )
    .await;

    let activate_link_result = creator_fixture.activate_link().await;
    (creator_fixture.link_fixture, activate_link_result)
}
