use std::time::Duration;

use candid::Principal;
use cashier_backend_client::client::CashierBackendClient;
use cashier_types::dto::{
    action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
    link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkDto},
    user::UserDto,
};
use ic_mple_client::PocketIcClient;
use icrc_ledger_types::icrc1::account::Account;

use crate::utils::{principal::get_user_principal, PocketIcTestContext};

pub struct LinkTestContext {
    pub link: Option<LinkDto>,
    pub user: Option<UserDto>,
    pub action: Option<ActionDto>,
    pub cashier_backend_client: Option<CashierBackendClient<PocketIcClient>>,
}

impl LinkTestContext {
    pub fn new() -> Self {
        Self {
            link: None,
            user: None,
            action: None,
            cashier_backend_client: None,
        }
    }

    pub async fn setup(&mut self, ctx: &PocketIcTestContext, caller: &Principal) -> &mut Self {
        // Initialize the cashier backend client with the provided caller
        self.cashier_backend_client = Some(ctx.new_cashier_backend_client(*caller));

        // call twice for `raw_rand`` work or else `raw_rand``` api will return error
        // more info https://forum.dfinity.org/t/pocket-ic-support-for-management-canister-calls-and-timers/25676/2
        ctx.advance_time(Duration::from_secs(1)).await;
        ctx.advance_time(Duration::from_secs(1)).await;

        // Create user
        let user = self
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_user()
            .await
            .unwrap()
            .unwrap();

        self.user = Some(user);

        self
    }

    pub async fn create_link(&mut self, input: CreateLinkInput) -> &mut Self {
        let link = self
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_link(input)
            .await
            .unwrap()
            .unwrap();

        self.link = Some(link);
        self
    }

    pub async fn create_tip_link(&mut self, ctx: &PocketIcTestContext) -> &mut Self {
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![LinkDetailUpdateAssetInfoInput {
                address: ctx.icp_ledger_principal.to_string(),
                chain: "IC".to_string(),
                label: "SEND_TIP_ASSET".to_string(),
                amount_per_link_use_action: 1000000, // 0.001 ICP in e8s
            }],
            template: "Central".to_string(),
            link_type: "SendTip".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };
        self.create_link(input).await;
        self
    }

    pub async fn create_token_basket_link(&mut self, ctx: &PocketIcTestContext) -> &mut Self {
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![
                LinkDetailUpdateAssetInfoInput {
                    address: ctx.icp_ledger_principal.to_string(),
                    chain: "IC".to_string(),
                    label: "SEND_TOKEN_BASKET_ASSET".to_string(),
                    amount_per_link_use_action: 10000000, // 0.001 ICP in e8s
                },
                LinkDetailUpdateAssetInfoInput {
                    address: ctx.icrc_token_map["ckBTC"].to_string(),
                    chain: "IC".to_string(),
                    label: "SEND_TOKEN_BASKET_ASSET".to_string(),
                    amount_per_link_use_action: 1000000, // 0.001 ICP in e8s
                },
                LinkDetailUpdateAssetInfoInput {
                    address: ctx.icrc_token_map["ckUSDC"].to_string(),
                    chain: "IC".to_string(),
                    label: "SEND_TOKEN_BASKET_ASSET".to_string(),
                    amount_per_link_use_action: 100000000, // 0.001 ICP in e8s
                },
            ],
            template: "Central".to_string(),
            link_type: "SendTokenBasket".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };
        self.create_link(input).await;
        self
    }

    pub async fn create_action(&mut self) -> &mut Self {
        let created_action = self
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_action(CreateActionInput {
                link_id: self.link.as_ref().unwrap().id.clone(),
                action_type: "CreateLink".to_string(),
            })
            .await
            .unwrap()
            .unwrap();

        self.action = Some(created_action);
        self
    }

    pub async fn process_action(&mut self) -> &mut Self {
        let link_id = self.link.as_ref().unwrap().id.clone();
        let action_id = self.action.as_ref().unwrap().id.clone();

        let processing_action = self
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .process_action(ProcessActionInput {
                action_id,
                action_type: "CreateLink".to_string(),
                link_id,
            })
            .await
            .unwrap()
            .unwrap();

        self.action = Some(processing_action);
        self
    }

    pub async fn update_action(&mut self) -> &mut Self {
        let link_id = self.link.as_ref().unwrap().id.clone();
        let action_id = self.action.as_ref().unwrap().id.clone();

        let updated_action = self
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .update_action(UpdateActionInput {
                action_id,
                link_id,
                external: true,
            })
            .await
            .unwrap()
            .unwrap();

        self.action = Some(updated_action);
        self
    }

    pub async fn airdrop_icp(&mut self, ctx: &PocketIcTestContext, amount: u64) -> &mut Self {
        let user = self.user.as_ref().unwrap();
        let caller = get_user_principal("token_deployer");

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);

        // Create user account identifier
        let user_account = Account {
            owner: Principal::from_text(&user.wallet).unwrap(),
            subaccount: None,
        };

        icp_ledger_client
            .transfer(user_account, amount)
            .await
            .unwrap();

        self
    }

    pub async fn airdrop_icrc(
        &mut self,
        ctx: &PocketIcTestContext,
        token_name: &str,
        amount: u64,
    ) -> &mut Self {
        let user = self.user.as_ref().unwrap();
        let caller = get_user_principal("token_deployer");
        let icrc_ledger_client = ctx.new_icrc_ledger_client(token_name, caller);

        let user_account = Account {
            owner: Principal::from_text(&user.wallet).unwrap(),
            subaccount: None,
        };

        icrc_ledger_client
            .transfer(user_account, amount)
            .await
            .unwrap();

        self
    }
}
