use std::{sync::Arc, time::Duration};

use candid::Principal;
use cashier_backend_client::client::CashierBackendClient;
use cashier_backend_types::{
    constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkDto, UpdateLinkInput},
        user::UserDto,
    },
};
use ic_mple_client::PocketIcClient;
use icrc_ledger_types::icrc1::account::Account;

use crate::utils::{PocketIcTestContext, principal::TestUser};

pub struct LinkTestFixture {
    ctx: Arc<PocketIcTestContext>,
    pub cashier_backend_client: Option<CashierBackendClient<PocketIcClient>>,
}

impl LinkTestFixture {
    pub async fn new(ctx: Arc<PocketIcTestContext>, caller: &Principal) -> Self {
        // Initialize the cashier backend client with the provided caller
        let cashier_backend_client = Some(ctx.new_cashier_backend_client(*caller));

        // call twice for `raw_rand`` work or else `raw_rand``` api will return error
        // more info https://forum.dfinity.org/t/pocket-ic-support-for-management-canister-calls-and-timers/25676/2
        ctx.advance_time(Duration::from_secs(1)).await;
        ctx.advance_time(Duration::from_secs(1)).await;

        Self {
            ctx,
            cashier_backend_client,
        }
    }

    /// This function is used to create a user. User should be created before creating a link.
    pub async fn setup_user(&self) -> UserDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .create_user()
            .await
            .unwrap()
            .unwrap()
    }

    // This is generic function to create a link.
    pub async fn create_link(&self, input: CreateLinkInput) -> LinkDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .create_link(input)
            .await
            .unwrap()
            .unwrap()
    }

    // Pre-defined input for creating tip link.
    pub async fn create_tip_link(&self, ctx: &PocketIcTestContext, amount: u64) -> LinkDto {
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![LinkDetailUpdateAssetInfoInput {
                address: ctx.icp_ledger_principal.to_string(),
                chain: "IC".to_string(),
                label: "SEND_TIP_ASSET".to_string(),
                amount_per_link_use_action: amount,
            }],
            template: "Central".to_string(),
            link_type: "SendTip".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };
        self.create_link(input).await
    }

    // Pre-defined input for creating token basket link.
    pub async fn create_token_basket_link(&self, ctx: &PocketIcTestContext) -> LinkDto {
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![
                LinkDetailUpdateAssetInfoInput {
                    address: ctx.icp_ledger_principal.to_string(),
                    chain: "IC".to_string(),
                    label: format!(
                        "{}_{}",
                        INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        ctx.icp_ledger_principal.to_text()
                    ),
                    amount_per_link_use_action: 10_000_000,
                },
                LinkDetailUpdateAssetInfoInput {
                    address: ctx.icrc_token_map["ckBTC"].to_string(),
                    chain: "IC".to_string(),
                    label: format!(
                        "{}_{}",
                        INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        ctx.icrc_token_map["ckBTC"].to_text()
                    ),
                    amount_per_link_use_action: 1_000_000,
                },
                LinkDetailUpdateAssetInfoInput {
                    address: ctx.icrc_token_map["ckUSDC"].to_string(),
                    chain: "IC".to_string(),
                    label: format!(
                        "{}_{}",
                        INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        ctx.icrc_token_map["ckUSDC"].to_text()
                    ),
                    amount_per_link_use_action: 10_000_000,
                },
            ],
            template: "Central".to_string(),
            link_type: "SendTokenBasket".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };
        self.create_link(input).await
    }

    // This function is used to create an action.
    pub async fn create_action(&self, link_id: &str, action_type: &str) -> ActionDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .create_action(CreateActionInput {
                link_id: link_id.to_string(),
                action_type: action_type.to_string(),
            })
            .await
            .unwrap()
            .unwrap()
    }

    // This function is used to process an action.
    // This function will update the action state to "Action_state_processing". and return icrc-112 requests if any.
    pub async fn process_action(&self, link_id: &str, action_id: &str) -> ActionDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .process_action(ProcessActionInput {
                action_id: action_id.to_string(),
                action_type: "CreateLink".to_string(),
                link_id: link_id.to_string(),
            })
            .await
            .unwrap()
            .unwrap()
    }

    // This function is used to update an action. Only use for after execute icrc-112 requests.
    pub async fn update_action(&self, link_id: &str, action_id: &str) -> ActionDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .update_action(UpdateActionInput {
                action_id: action_id.to_string(),
                link_id: link_id.to_string(),
                external: true,
            })
            .await
            .unwrap()
            .unwrap()
    }

    // This function is used to get an action by link_id and action_id.
    pub async fn get_action(&self, link_id: &str, _action_id: &str) -> ActionDto {
        // Use get_link with action type to retrieve the action
        let response = self
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .get_link(
                link_id.to_string(),
                Some(cashier_backend_types::dto::link::GetLinkOptions {
                    action_type: "CreateLink".to_string(),
                }),
            )
            .await
            .unwrap()
            .unwrap();

        response.action.unwrap()
    }

    pub async fn update_link(&self, input: UpdateLinkInput) -> LinkDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .update_link(input)
            .await
            .unwrap()
            .unwrap()
    }

    // This function is used to airdrop ICP to the user.
    pub async fn airdrop_icp(
        &mut self,
        ctx: &PocketIcTestContext,
        amount: u64,
        to_user: &Principal,
    ) -> () {
        let caller = TestUser::TokenDeployer.get_principal();

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);

        // Create user account identifier
        let user_account = Account {
            owner: *to_user,
            subaccount: None,
        };

        icp_ledger_client
            .transfer(user_account, amount)
            .await
            .unwrap();
    }

    // This function is used to airdrop ICRC to the user.
    pub async fn airdrop_icrc(
        &mut self,
        ctx: &PocketIcTestContext,
        token_name: &str,
        amount: u64,
        to_user: &Principal,
    ) -> () {
        let caller = TestUser::TokenDeployer.get_principal();
        let icrc_ledger_client = ctx.new_icrc_ledger_client(token_name, caller);

        let user_account = Account {
            owner: *to_user,
            subaccount: None,
        };

        icrc_ledger_client
            .transfer(user_account, amount)
            .await
            .unwrap();
    }

    pub fn tip_link_input(&self, amount: u64) -> CreateLinkInput {
        CreateLinkInput {
            title: "Test Tip Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![LinkDetailUpdateAssetInfoInput {
                address: self.ctx.icp_ledger_principal.to_string(),
                chain: "IC".to_string(),
                label: "SEND_TIP_ASSET".to_string(),
                amount_per_link_use_action: amount,
            }],
            template: "Central".to_string(),
            link_type: "SendTip".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test tip-link for integration testing".to_string()),
        }
    }
}
