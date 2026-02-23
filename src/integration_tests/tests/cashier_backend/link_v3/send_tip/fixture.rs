use crate::{
    cashier_backend::link_v3::fixture::LinkTestFixtureV3,
    utils::{PocketIcTestContext, icrc_112, principal::TestUser},
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    constant,
    link_v3::dto::{
        action::{CreateActionInputV3, ProcessActionResponseV3},
        link::{CreateLinkInputV3, CreateLinkResponseV3},
    },
};
use cashier_shared::types::LinkType as LinkTypeShared;
use std::sync::Arc;

pub struct TipLinkV3Fixture {
    pub caller: Principal,
    pub token: String,
    pub amount: Nat,
    pub token_fee: Nat,
    pub link_fixture: LinkTestFixtureV3,
}

impl TipLinkV3Fixture {
    pub async fn new(
        ctx: Arc<PocketIcTestContext>,
        caller: Principal,
        token: &str,
        amount: Nat,
        token_fee: Nat,
        icp_ledger_fee: Nat,
    ) -> Self {
        let link_fixture =
            LinkTestFixtureV3::new(Arc::clone(&ctx), caller, icp_ledger_fee.clone()).await;

        Self {
            caller,
            token: token.to_string(),
            amount,
            link_fixture,
            token_fee,
        }
    }

    /// This function creates a tip link v3.
    /// # Returns
    /// * `CreateLinkResponseV3` - The created tip link data
    pub async fn create_link(&self) -> CreateLinkResponseV3 {
        self.link_fixture
            .create_link_v3(self.tip_link_input().unwrap())
            .await
    }

    /// This function activates a tip link v3.
    /// # Returns
    /// * `ProcessActionResponseV3` - The activated action data
    pub async fn activate_link(&mut self) -> ProcessActionResponseV3 {
        let create_link_result = self.create_link().await;
        let link_id = create_link_result.action.id.clone();

        self.airdrop_icp_and_asset().await;

        // Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let _icrc112_execution_result = icrc_112::execute_icrc112_request(
            &icrc_112_requests,
            self.caller,
            &self.link_fixture.ctx,
        )
        .await;

        self.link_fixture.activate_link_v3(&link_id).await.unwrap()
    }

    /// Creates the input for a tip link.
    ///
    /// # Arguments
    /// - `tokens`: A vector of token identifiers (e.g., ["ICP"])
    /// - `amounts`: A vector of corresponding amounts (e.g., [100_000_000])
    ///
    /// # Returns
    /// - A `CreateLinkInput` struct containing the transformed asset_info vector.
    /// # Errors
    /// Returns an error if the tokens not found in the token map
    pub fn tip_link_input(&self) -> Result<CreateLinkInputV3, String> {
        let create_action = self.link_fixture.create_action_from_tokens_and_amount(
            self.caller,
            vec![self.token.to_string()],
            vec![self.amount.clone()],
            vec![self.token_fee.clone()],
        )?;

        Ok(CreateLinkInputV3 {
            title: "Test Tip Link".to_string(),
            link_type: LinkTypeShared::SendTip,
            max_use: 1,
            action: create_action,
        })
    }

    pub fn create_action_input(&self, link_id: &str) -> CreateActionInputV3 {
        CreateActionInputV3 {
            link_id: link_id.to_string(),
            action: self
                .link_fixture
                .create_action_from_tokens_and_amount(
                    self.caller,
                    vec![self.token.to_string()],
                    vec![self.amount.clone()],
                    vec![self.token_fee.clone()],
                )
                .unwrap(),
        }
    }

    /// This function is used to airdrop ICP and the specified asset to the caller.
    /// # Returns
    /// * `()` - No return value
    pub async fn airdrop_icp_and_asset(&mut self) {
        let initial_balance = Nat::from(1_000_000_000u64);
        let mut link_fixture = self.link_fixture.clone();

        link_fixture
            .airdrop_icp(initial_balance.clone(), &self.caller)
            .await;

        if self.token != constant::ICP_TOKEN {
            link_fixture
                .airdrop_icrc(&self.token, initial_balance.clone(), &self.caller)
                .await;
        }
    }
}

/// Creates a fixture for a tip link v2.
/// # Arguments
/// * `ctx` - The Pocket IC test context
/// * `creator` - The principal of the creator
/// * `token` - The token identifier (e.g., "ICP")
/// * `amount` - The tip amount
/// # Returns
/// * `(LinkTestFixtureV3, CreateLinkResponseV3)` - The link test fixture and the CreateLinkResponseV3
pub async fn create_tip_linkv3_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    token: &str,
    amount: Nat,
    token_fee: Nat,
    icp_ledger_fee: Nat,
) -> (LinkTestFixtureV3, CreateLinkResponseV3) {
    let mut creator_fixture = TipLinkV3Fixture::new(
        Arc::new(ctx.clone()),
        creator,
        token,
        amount.clone(),
        token_fee.clone(),
        icp_ledger_fee.clone(),
    )
    .await;

    creator_fixture.airdrop_icp_and_asset().await;

    let link_response = creator_fixture.create_link().await;
    (creator_fixture.link_fixture, link_response)
}

/// Activate a tip link v3 fixture.
/// # Arguments
/// * `ctx` - The Pocket IC test context
/// * `token` - The token identifier (e.g., "ICP")
/// * `amount` - The tip amount
/// # Returns
/// * `(LinkTestFixture, ProcessActionDto)` - The link test fixture and the ProcessActionDto
pub async fn activate_tip_link_v3_fixture(
    ctx: &PocketIcTestContext,
    token: &str,
    amount: Nat,
    token_fee: Nat,
    icp_ledger_fee: Nat,
) -> (LinkTestFixtureV3, ProcessActionResponseV3) {
    let creator = TestUser::User1.get_principal();
    let mut creator_fixture = TipLinkV3Fixture::new(
        Arc::new(ctx.clone()),
        creator,
        token,
        amount.clone(),
        token_fee.clone(),
        icp_ledger_fee.clone(),
    )
    .await;
    let activate_link_result = creator_fixture.activate_link().await;
    (creator_fixture.link_fixture, activate_link_result)
}
