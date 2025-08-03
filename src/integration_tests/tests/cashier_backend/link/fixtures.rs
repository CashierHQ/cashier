use std::time::Duration;

use cashier_backend_client::client::CashierBackendClient;
use cashier_types::dto::{
    action::{ActionDto, CreateActionInput, ProcessActionInput},
    link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkDto},
    user::UserDto,
};
use ic_mple_client::PocketIcClient;

use crate::utils::{principal::get_user_principal, PocketIcTestContext};

pub struct CreateLinkTestFixture {
    pub link: LinkDto,
    pub user: UserDto,
    pub action: Option<ActionDto>,
    pub cashier_backend_client: CashierBackendClient<PocketIcClient>,
}

impl CreateLinkTestFixture {
    pub fn new(cashier_backend_client: CashierBackendClient<PocketIcClient>) -> Self {
        Self {
            link: LinkDto {
                id: String::new(),
                state: String::new(),
                title: None,
                description: None,
                link_type: None,
                asset_info: None,
                template: None,
                creator: String::new(),
                create_at: 0,
                metadata: None,
                link_use_action_counter: 0,
                link_use_action_max_count: 0,
            },
            user: UserDto {
                id: String::new(),
                email: None,
                wallet: String::new(),
            },
            action: None,
            cashier_backend_client,
        }
    }

    pub async fn setup_environment(&mut self, ctx: &PocketIcTestContext) -> &mut Self {
        let caller = get_user_principal("user1");
        self.cashier_backend_client = ctx.new_cashier_backend_client(caller);

        // call twice for `raw_rand`` work or else `raw_rand``` api will return error
        // more info https://forum.dfinity.org/t/pocket-ic-support-for-management-canister-calls-and-timers/25676/2
        ctx.advance_time(Duration::from_secs(1)).await;
        ctx.advance_time(Duration::from_secs(1)).await;

        let user = self
            .cashier_backend_client
            .create_user()
            .await
            .unwrap()
            .unwrap();
        self.user = user;

        self
    }

    pub async fn create_link(&mut self) -> &mut Self {
        let link = self
            .cashier_backend_client
            .create_link(CreateLinkInput {
                title: "Test Link".to_string(),
                link_use_action_max_count: 10,
                asset_info: vec![LinkDetailUpdateAssetInfoInput {
                    address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                    chain: "IC".to_string(),
                    label: "SEND_TIP_ASSET".to_string(),
                    amount_per_link_use_action: 1000000, // 0.001 ICP in e8s
                }],
                template: "Central".to_string(),
                link_type: "SendTip".to_string(),
                nft_image: None,
                link_image_url: None,
                description: Some("Test link for integration testing".to_string()),
            })
            .await
            .unwrap()
            .unwrap();

        self.link = link;
        self
    }

    pub async fn create_action(&mut self) -> &mut Self {
        let created_action = self
            .cashier_backend_client
            .create_action(CreateActionInput {
                link_id: self.link.id.clone(),
                action_type: "CreateLink".to_string(),
            })
            .await
            .unwrap()
            .unwrap();

        self.action = Some(created_action);
        self
    }

    pub async fn process_action(&mut self) -> &mut Self {
        let link_id = self.link.id.clone();
        let action_id = self.action.as_ref().unwrap().id.clone();

        let processing_action = self
            .cashier_backend_client
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

    pub fn get_action(&self) -> &ActionDto {
        self.action.as_ref().expect("Action not created yet")
    }

    pub fn get_action_mut(&mut self) -> &mut ActionDto {
        self.action.as_mut().expect("Action not created yet")
    }
}
