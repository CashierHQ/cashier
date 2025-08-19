use crate::utils::{
    PocketIcTestContext, PocketIcTestContextBuilder, icrc_112, principal::TestUser,
};
use candid::Principal;
use cashier_backend_client::client::CashierBackendClient;
use cashier_backend_types::{
    constant,
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkDto, UpdateLinkInput},
        user::UserDto,
    },
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v2::IntentState,
        link::v1::{LinkState, LinkType},
    },
};
use cashier_common::utils;
use ic_mple_client::PocketIcClient;
use icrc_ledger_types::icrc1::account::Account;
use std::{sync::Arc, time::Duration};
use token_storage_types::token;

pub struct LinkTestFixture {
    pub ctx: Arc<PocketIcTestContext>,
    pub caller: Principal,
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
            caller: *caller,
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
    pub async fn create_tip_link(&self, amount: u64) -> LinkDto {
        self.create_link(self.tip_link_input(amount)).await
    }

    // Pre-defined input for creating token basket link.
    pub async fn create_token_basket_link(&self) -> LinkDto {
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![
                LinkDetailUpdateAssetInfoInput {
                    address: self.ctx.icp_ledger_principal.to_string(),
                    chain: "IC".to_string(),
                    label: format!(
                        "{}_{}",
                        constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        self.ctx.icp_ledger_principal.to_text()
                    ),
                    amount_per_link_use_action: 10_000_000,
                },
                LinkDetailUpdateAssetInfoInput {
                    address: self.ctx.icrc_token_map["ckBTC"].to_string(),
                    chain: "IC".to_string(),
                    label: format!(
                        "{}_{}",
                        constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        self.ctx.icrc_token_map["ckBTC"].to_text()
                    ),
                    amount_per_link_use_action: 1_000_000,
                },
                LinkDetailUpdateAssetInfoInput {
                    address: self.ctx.icrc_token_map["ckUSDC"].to_string(),
                    chain: "IC".to_string(),
                    label: format!(
                        "{}_{}",
                        constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        self.ctx.icrc_token_map["ckUSDC"].to_text()
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
    pub async fn process_action(
        &self,
        link_id: &str,
        action_id: &str,
        action_type: &str,
    ) -> ActionDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .process_action(ProcessActionInput {
                action_id: action_id.to_string(),
                action_type: action_type.to_string(),
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
    pub async fn airdrop_icp(&mut self, amount: u64, to_user: &Principal) -> () {
        let caller = TestUser::TokenDeployer.get_principal();

        let icp_ledger_client = self.ctx.new_icp_ledger_client(caller);

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
    pub async fn airdrop_icrc(&mut self, token_name: &str, amount: u64, to_user: &Principal) -> () {
        let caller = TestUser::TokenDeployer.get_principal();
        let icrc_ledger_client = self.ctx.new_icrc_ledger_client(token_name, caller);

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
            link_type: constant::SEND_TIP_LINK_TYPE.to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test tip-link for integration testing".to_string()),
        }
    }

    pub fn token_basket_link_input(
        &self,
        tokens: Vec<String>,
        amounts: Vec<u64>,
    ) -> Result<CreateLinkInput, String> {
        if tokens.len() != amounts.len() {
            return Err(format!(
                "Tokens and amounts must have the same length: {} vs {}",
                tokens.len(),
                amounts.len()
            ));
        }

        let asset_info = self.asset_info_from_tokens_and_amount(
            tokens,
            amounts,
            constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
            true,
        )?;

        Ok(CreateLinkInput {
            title: "Test Token Basket Link".to_string(),
            link_use_action_max_count: 1,
            asset_info,
            template: "Central".to_string(),
            link_type: constant::SEND_TOKEN_BASKET_LINK_TYPE.to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test token basket link for integration testing".to_string()),
        })
    }

    pub fn airdrop_link_input(
        &self,
        tokens: Vec<String>,
        amounts: Vec<u64>,
        max_count: u64,
    ) -> Result<CreateLinkInput, String> {
        if tokens.len() != amounts.len() {
            return Err(format!(
                "Tokens and amounts must have the same length: {} vs {}",
                tokens.len(),
                amounts.len()
            ));
        }

        let asset_info = self.asset_info_from_tokens_and_amount(
            tokens,
            amounts,
            constant::INTENT_LABEL_SEND_AIRDROP_ASSET,
            false,
        )?;

        Ok(CreateLinkInput {
            title: "Test Airdrop Link".to_string(),
            link_use_action_max_count: max_count,
            asset_info,
            template: "Central".to_string(),
            link_type: constant::SEND_AIRDROP_LINK_TYPE.to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test airdrop link for integration testing".to_string()),
        })
    }

    pub fn receive_payment_link_input(
        &self,
        tokens: Vec<String>,
        amounts: Vec<u64>,
    ) -> Result<CreateLinkInput, String> {
        if tokens.len() != amounts.len() {
            return Err(format!(
                "Tokens and amounts must have the same length: {} vs {}",
                tokens.len(),
                amounts.len()
            ));
        }

        let asset_info = self.asset_info_from_tokens_and_amount(
            tokens,
            amounts,
            constant::INTENT_LABEL_RECEIVE_PAYMENT_ASSET,
            false,
        )?;

        Ok(CreateLinkInput {
            title: "Test Receive Payment Link".to_string(),
            link_use_action_max_count: 1,
            asset_info,
            template: "Central".to_string(),
            link_type: constant::RECEIVE_PAYMENT_LINK_TYPE.to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test receive payment link for integration testing".to_string()),
        })
    }

    fn asset_info_from_tokens_and_amount(
        &self,
        tokens: Vec<String>,
        amounts: Vec<u64>,
        label: &str,
        is_token_basket: bool,
    ) -> Result<Vec<LinkDetailUpdateAssetInfoInput>, String> {
        if tokens.len() != amounts.len() {
            return Err(format!(
                "Tokens and amounts must have the same length: {} vs {}",
                tokens.len(),
                amounts.len()
            ));
        }

        tokens
            .into_iter()
            .zip(amounts)
            .map(|(token, amount)| match token.as_str() {
                constant::ICP_TOKEN => {
                    if is_token_basket {
                        Ok(LinkDetailUpdateAssetInfoInput {
                            address: self.ctx.icp_ledger_principal.to_string(),
                            chain: "IC".to_string(),
                            label: format!("{}_{}", label, self.ctx.icp_ledger_principal.to_text()),
                            amount_per_link_use_action: amount,
                        })
                    } else {
                        Ok(LinkDetailUpdateAssetInfoInput {
                            address: self.ctx.icp_ledger_principal.to_string(),
                            chain: "IC".to_string(),
                            label: label.to_string(),
                            amount_per_link_use_action: amount,
                        })
                    }
                }
                _ => match self.ctx.icrc_token_map.get(&token) {
                    Some(token_principal) => {
                        if is_token_basket {
                            Ok(LinkDetailUpdateAssetInfoInput {
                                address: token_principal.to_string(),
                                chain: "IC".to_string(),
                                label: format!("{}_{}", label, token_principal.to_text()),
                                amount_per_link_use_action: amount,
                            })
                        } else {
                            Ok(LinkDetailUpdateAssetInfoInput {
                                address: token_principal.to_string(),
                                chain: "IC".to_string(),
                                label: label.to_string(),
                                amount_per_link_use_action: amount,
                            })
                        }
                    }
                    None => Err(format!("Token {} not found in icrc_token_map", token)),
                },
            })
            .collect()
    }
}

pub async fn create_tip_link_fixture() -> (LinkTestFixture, LinkDto) {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let caller = TestUser::User1.get_principal();
    let mut creator_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

    let initial_balance = 1_000_000_000u64;
    let tip_amount = 1_000_000u64;

    creator_fixture.airdrop_icp(initial_balance, &caller).await;
    creator_fixture.setup_user().await;

    let link = creator_fixture.create_tip_link(tip_amount).await;
    let create_action = creator_fixture
        .create_action(&link.id, constant::CREATE_LINK_ACTION)
        .await;
    let processing_action = creator_fixture
        .process_action(&link.id, &create_action.id, constant::CREATE_LINK_ACTION)
        .await;
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let _icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;
    let _update_action = creator_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Act
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: constant::CONTINUE_ACTION.to_string(),
        params: None,
    };
    let update_link = creator_fixture.update_link(update_link_input).await;

    // Assert
    assert_eq!(update_link.state, LinkState::Active.to_string());

    (creator_fixture, update_link)
}

pub async fn create_token_basket_link_fixture() -> (LinkTestFixture, LinkDto) {
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .with_icrc_tokens(vec![
            constant::CKBTC_ICRC_TOKEN.to_string(),
            constant::CKUSDC_ICRC_TOKEN.to_string(),
        ])
        .build_async()
        .await;

    let caller = TestUser::User1.get_principal();

    let mut creator_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;
    creator_fixture.setup_user().await;

    let icp_ledger_client = ctx.new_icp_ledger_client(caller);
    let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
    let ckusdc_ledger_client = ctx.new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, caller);
    let icp_initial_balance = 1_000_000_000u64;
    let ckbtc_initial_balance = 1_000_000_000u64;
    let ckusdc_initial_balance = 1_000_000_000u64;

    // Act
    creator_fixture
        .airdrop_icp(icp_initial_balance, &caller)
        .await;
    creator_fixture
        .airdrop_icrc(constant::CKBTC_ICRC_TOKEN, ckbtc_initial_balance, &caller)
        .await;
    creator_fixture
        .airdrop_icrc(constant::CKUSDC_ICRC_TOKEN, ckusdc_initial_balance, &caller)
        .await;

    // Assert
    let caller_account = Account {
        owner: caller,
        subaccount: None,
    };
    let icp_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    let ckbtc_balance = ckbtc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();
    let ckusdc_balance = ckusdc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();

    assert_eq!(icp_balance, icp_initial_balance);
    assert_eq!(ckbtc_balance, ckbtc_initial_balance);
    assert_eq!(ckusdc_balance, ckusdc_initial_balance);

    // Arrange
    let icp_link_amount = 10_000_000u64;
    let ckbtc_link_amount = 1_000u64;
    let ckusdc_link_amount = 50_000_000u64;
    let link_input = creator_fixture
        .token_basket_link_input(
            vec![
                constant::ICP_TOKEN.to_string(),
                constant::CKBTC_ICRC_TOKEN.to_string(),
                constant::CKUSDC_ICRC_TOKEN.to_string(),
            ],
            vec![icp_link_amount, ckbtc_link_amount, ckusdc_link_amount],
        )
        .unwrap();

    // Act
    let link = creator_fixture.create_link(link_input).await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::SendTokenBasket.to_string()));
    assert!(link.asset_info.is_some());
    assert_eq!(link.asset_info.as_ref().unwrap().len(), 3);

    // Act
    let create_action = creator_fixture
        .create_action(&link.id, constant::CREATE_LINK_ACTION)
        .await;

    // Assert
    assert!(!create_action.id.is_empty());
    assert_eq!(create_action.r#type, ActionType::CreateLink.to_string());
    assert_eq!(create_action.state, ActionState::Created.to_string());
    assert_eq!(create_action.intents.len(), 4);

    // Act
    let processing_action = creator_fixture
        .process_action(&link.id, &create_action.id, constant::CREATE_LINK_ACTION)
        .await;

    // Assert
    assert_eq!(processing_action.id, create_action.id);
    assert_eq!(processing_action.r#type, ActionType::CreateLink.to_string());
    assert_eq!(processing_action.state, ActionState::Processing.to_string());
    assert!(processing_action.icrc_112_requests.is_some());
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap().len(),
        2
    );
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap()[0].len(),
        4,
        "First request should have 4 elements"
    );
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap()[1].len(),
        1,
        "Second request should have 1 element"
    );

    // Arrange
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

    // Act
    let icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;

    // Assert
    assert!(icrc112_execution_result.is_ok());

    // Act
    let update_action = creator_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Assert
    assert_eq!(update_action.id, processing_action.id);
    assert_eq!(update_action.r#type, ActionType::CreateLink.to_string());
    assert_eq!(update_action.state, ActionState::Success.to_string());
    assert!(
        update_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    let ckbtc_balance_after = ckbtc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();
    let ckusdc_balance_after = ckusdc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();
    let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
    let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
    let ckusdc_ledger_fee = ckusdc_ledger_client.fee().await.unwrap();

    assert_eq!(
        icp_balance_after,
        icp_initial_balance
            - icp_link_amount
            - utils::calculate_create_link_fee(constant::ICP_TOKEN, &icp_ledger_fee, 1),
        "ICP balance after link creation is incorrect"
    );
    assert_eq!(
        ckbtc_balance_after,
        ckbtc_initial_balance
            - ckbtc_link_amount
            - utils::calculate_create_link_fee(constant::CKBTC_ICRC_TOKEN, &ckbtc_ledger_fee, 1),
        "CKBTC balance after link creation is incorrect"
    );
    assert_eq!(
        ckusdc_balance_after,
        ckusdc_initial_balance
            - ckusdc_link_amount
            - utils::calculate_create_link_fee(constant::CKUSDC_ICRC_TOKEN, &ckusdc_ledger_fee, 1),
        "CKUSDC balance after link creation is incorrect"
    );

    // Act
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: constant::CONTINUE_ACTION.to_string(),
        params: None,
    };
    let update_link = creator_fixture.update_link(update_link_input).await;

    // Assert
    assert_eq!(update_link.state, LinkState::Active.to_string());

    (creator_fixture, update_link)
}
