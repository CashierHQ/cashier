use crate::{
    cashier_backend::link_v2::fixture::LinkTestFixtureV2,
    utils::{PocketIcTestContext, icrc_112},
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    constant,
    dto::link::CreateLinkInput,
    link_v2::dto::{CreateLinkDto, ProcessActionDto},
    repository::link::v1::LinkType,
};
use std::sync::Arc;

pub struct TipLinkV2Feature {
    pub caller: Principal,
    pub token: String,
    pub amount: Nat,
    pub link_fixture: LinkTestFixtureV2,
}

impl TipLinkV2Feature {
    pub async fn new(
        ctx: Arc<PocketIcTestContext>,
        caller: Principal,
        token: &str,
        amount: Nat,
    ) -> Self {
        let link_fixture = LinkTestFixtureV2::new(Arc::clone(&ctx), caller).await;

        Self {
            caller,
            token: token.to_string(),
            amount,
            link_fixture,
        }
    }

    /// This function creates a tip link v2.
    /// # Returns
    /// * `CreateLinkDto` - The created tip link data
    pub async fn create_tip_link(&self) -> CreateLinkDto {
        self.link_fixture
            .create_link_v2(self.tip_link_input().unwrap())
            .await
    }

    /// This function activates a tip link v2.
    /// # Returns
    /// * `ProcessActionDto` - The activated action data
    pub async fn activate_tip_link(&mut self) -> ProcessActionDto {
        let create_link_result = self.create_tip_link().await;
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
    pub fn tip_link_input(&self) -> Result<CreateLinkInput, String> {
        let asset_info = self.link_fixture.asset_info_from_tokens_and_amount(
            vec![self.token.to_string()],
            vec![self.amount.clone()],
            constant::INTENT_LABEL_SEND_TIP_ASSET,
            false,
        )?;

        Ok(CreateLinkInput {
            title: "Test Tip Link".to_string(),
            link_use_action_max_count: 1,
            asset_info,
            link_type: LinkType::SendTip,
        })
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
