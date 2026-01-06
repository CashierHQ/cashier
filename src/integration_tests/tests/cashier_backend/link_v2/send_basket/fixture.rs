// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    cashier_backend::link_v2::fixture::LinkTestFixtureV2,
    utils::{PocketIcTestContext, icrc_112, principal::TestUser},
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    constant,
    dto::link::CreateLinkInput,
    link_v2::dto::{CreateLinkDto, ProcessActionDto},
    repository::link::v1::LinkType,
};
use std::sync::Arc;

pub struct BasketLinkV2Fixture {
    pub caller: Principal,
    pub tokens: Vec<String>,
    pub amounts: Vec<Nat>,
    pub link_fixture: LinkTestFixtureV2,
}

impl BasketLinkV2Fixture {
    pub async fn new(
        ctx: Arc<PocketIcTestContext>,
        caller: Principal,
        tokens: Vec<String>,
        amounts: Vec<Nat>,
    ) -> Self {
        let link_fixture = LinkTestFixtureV2::new(Arc::clone(&ctx), caller).await;

        Self {
            caller,
            tokens,
            amounts,
            link_fixture,
        }
    }

    /// This function creates an basket link v2.
    /// # Returns
    /// * `CreateLinkDto` - The created basket link data
    pub async fn create_link(&self) -> CreateLinkDto {
        self.link_fixture
            .create_link_v2(
                self.token_basket_link_input(self.tokens.clone(), self.amounts.clone())
                    .unwrap(),
            )
            .await
    }

    /// This function activates an basket link v2.
    /// # Returns
    /// * `ProcessActionDto` - The activated action data
    pub async fn activate_link(&mut self) -> ProcessActionDto {
        let create_link_result = self.create_link().await;
        let link_id = create_link_result.action.id.clone();

        self.airdrop_icp_and_asset().await;

        // Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let _icrc112_execution_result = icrc_112::execute_icrc112_request(
            &icrc_112_requests,
            self.caller,
            &self.link_fixture.ctx,
        )
        .await;

        self.link_fixture.activate_link_v2(&link_id).await.unwrap()
    }

    /// Creates the input for a token basket link.
    ///
    /// # Arguments
    /// - `tokens`: A vector of token identifiers (e.g., ["ICP"])
    /// - `amounts`: A vector of corresponding amounts (e.g., [100_000_000])
    ///
    /// # Returns
    /// - A `CreateLinkInput` struct containing the transformed asset_info vector.
    /// # Errors
    /// Returns an error if the tokens not found in the token map
    pub fn token_basket_link_input(
        &self,
        tokens: Vec<String>,
        amounts: Vec<Nat>,
    ) -> Result<CreateLinkInput, String> {
        if tokens.len() != amounts.len() {
            return Err(format!(
                "Tokens and amounts must have the same length: {} vs {}",
                tokens.len(),
                amounts.len()
            ));
        }

        let asset_info = self.link_fixture.asset_info_from_tokens_and_amount(
            tokens,
            amounts,
            constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
            true,
        )?;

        Ok(CreateLinkInput {
            title: "Test Token Basket Link".to_string(),
            link_use_action_max_count: 1,
            asset_info,
            link_type: LinkType::SendTokenBasket,
        })
    }

    /// This function is used to basket ICP and the specified asset to the caller.
    /// # Returns
    /// * `()` - No return value
    pub async fn airdrop_icp_and_asset(&mut self) {
        let initial_balance = Nat::from(1_000_000_000u64);
        let mut link_fixture = self.link_fixture.clone();

        link_fixture
            .airdrop_icp(initial_balance.clone(), &self.caller)
            .await;

        for token in self.tokens.iter() {
            if token == constant::ICP_TOKEN {
                continue;
            }
            link_fixture
                .airdrop_icrc(token, initial_balance.clone(), &self.caller)
                .await;
        }
    }
}

/// Creates a fixture for an basket link v2.
/// # Arguments
/// * `ctx` - The Pocket IC test context
/// * `creator` - The principal of the creator
/// * `tokens` - A vector of token identifiers (e.g., ["ICP"])
/// * `amounts` - A vector of corresponding amounts (e.g., [100_000_000])
/// * `max_use_count` - The maximum use count for the link
/// # Returns
/// * `(LinkTestFixtureV2, GetLinkResp)` - The link test fixture and the GetLinkResp
pub async fn create_basket_link_v2_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    tokens: Vec<String>,
    amounts: Vec<Nat>,
) -> (LinkTestFixtureV2, CreateLinkDto) {
    let mut creator_fixture =
        BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;

    creator_fixture.airdrop_icp_and_asset().await;

    let link_response = creator_fixture.create_link().await;
    (creator_fixture.link_fixture, link_response)
}

/// Activate an basket link v2 fixture.
/// # Arguments
/// * `ctx` - The Pocket IC test context
/// * `tokens` - A vector of token identifiers (e.g., ["ICP"])
/// * `amounts` - A vector of corresponding amounts (e.g., [100_000_000])
/// * `max_use_count` - The maximum use count for the link
/// # Returns
/// * `(LinkTestFixture, ProcessActionDto)` - The link test fixture and the ProcessActionDto
pub async fn activate_basket_link_v2_fixture(
    ctx: &PocketIcTestContext,
    tokens: Vec<String>,
    amounts: Vec<Nat>,
) -> (LinkTestFixtureV2, ProcessActionDto) {
    let creator = TestUser::User1.get_principal();
    let mut creator_fixture =
        BasketLinkV2Fixture::new(Arc::new(ctx.clone()), creator, tokens, amounts).await;

    let activate_link_result = creator_fixture.activate_link().await;
    (creator_fixture.link_fixture, activate_link_result)
}
