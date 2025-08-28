use crate::utils::{
    PocketIcTestContext, PocketIcTestContextBuilder, icrc_112, principal::TestUser,
};
use candid::Principal;
use cashier_backend_client::client::CashierBackendClient;
use cashier_backend_types::{
    constant,
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{
            CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkDto, LinkStateMachineGoto,
            UpdateLinkInput,
        },
    },
    repository::{
        action::v1::ActionType,
        common::Asset,
        link::v1::{LinkType, Template},
    },
};
use ic_mple_client::PocketIcClient;
use icrc_ledger_types::icrc1::account::Account;
use std::{sync::Arc, time::Duration};

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
    pub async fn create_tip_link(&self, token: &str, amount: u64) -> LinkDto {
        let link_input = self
            .tip_link_input(vec![token.to_string()], vec![amount])
            .unwrap();
        self.create_link(link_input).await
    }

    // Pre-defined input for creating token basket link.
    pub async fn create_token_basket_link(&self) -> LinkDto {
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![
                LinkDetailUpdateAssetInfoInput {
                    asset: Asset::IC {
                        address: self.ctx.icp_ledger_principal,
                    },
                    label: format!(
                        "{}_{}",
                        constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        self.ctx.icp_ledger_principal.to_text()
                    ),
                    amount_per_link_use_action: 10_000_000,
                },
                LinkDetailUpdateAssetInfoInput {
                    asset: Asset::IC {
                        address: self.ctx.icrc_token_map["ckBTC"],
                    },
                    label: format!(
                        "{}_{}",
                        constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        self.ctx.icrc_token_map["ckBTC"].to_text()
                    ),
                    amount_per_link_use_action: 1_000_000,
                },
                LinkDetailUpdateAssetInfoInput {
                    asset: Asset::IC {
                        address: self.ctx.icrc_token_map["ckUSDC"],
                    },
                    label: format!(
                        "{}_{}",
                        constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                        self.ctx.icrc_token_map["ckUSDC"].to_text()
                    ),
                    amount_per_link_use_action: 10_000_000,
                },
            ],
            template: Template::Central,
            link_type: LinkType::SendTokenBasket,
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };
        self.create_link(input).await
    }

    // This function is used to create an action.
    pub async fn create_action(&self, link_id: &str, action_type: ActionType) -> ActionDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .create_action(CreateActionInput {
                link_id: link_id.to_string(),
                action_type,
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
        action_type: ActionType,
    ) -> ActionDto {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .process_action(ProcessActionInput {
                action_id: action_id.to_string(),
                action_type,
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
    pub async fn get_action(&self, link_id: &str) -> ActionDto {
        // Use get_link with action type to retrieve the action
        let response = self
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .get_link(
                link_id.to_string(),
                Some(cashier_backend_types::dto::link::GetLinkOptions {
                    action_type: ActionType::CreateLink,
                }),
            )
            .await
            .unwrap()
            .unwrap();

        response.action.unwrap()
    }

    // This function is used to update a link.
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
    pub fn tip_link_input(
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
            constant::INTENT_LABEL_SEND_TIP_ASSET,
            false,
        )?;

        Ok(CreateLinkInput {
            title: "Test Tip Link".to_string(),
            link_use_action_max_count: 1,
            asset_info,
            template: Template::Central,
            link_type: LinkType::SendTip,
            nft_image: None,
            link_image_url: None,
            description: Some("Test tip-link for integration testing".to_string()),
        })
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
            template: Template::Central,
            link_type: LinkType::SendTokenBasket,
            nft_image: None,
            link_image_url: None,
            description: Some("Test token basket link for integration testing".to_string()),
        })
    }

    /// Creates the input for an airdrop link.
    ///
    /// # Arguments
    /// - `tokens`: A vector of token identifiers (e.g., ["ICP"])
    /// - `amounts`: A vector of corresponding amounts (e.g., [100_000_000])
    /// - `max_count`: The maximum number of times the link can be used
    ///
    /// # Returns
    /// - A `CreateLinkInput` struct containing the transformed asset_info vector.
    /// # Errors
    /// Returns an error if the tokens not found in the token map
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
            template: Template::Central,
            link_type: LinkType::SendAirdrop,
            nft_image: None,
            link_image_url: None,
            description: Some("Test airdrop link for integration testing".to_string()),
        })
    }

    /// Creates the input for a receive payment link.
    ///
    /// # Arguments
    /// - `tokens`: A vector of token identifiers (e.g., ["ICP"])
    /// - `amounts`: A vector of corresponding amounts (e.g., [100_000_000])
    ///
    /// # Returns
    /// - A `CreateLinkInput` struct containing the transformed asset_info vector.
    /// # Errors
    /// Returns an error if the tokens not found in the token map
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
            template: Template::Central,
            link_type: LinkType::ReceivePayment,
            nft_image: None,
            link_image_url: None,
            description: Some("Test receive payment link for integration testing".to_string()),
        })
    }

    /// Creates the asset information from the provided tokens and amounts.
    /// Creates the asset information from the provided tokens and amounts.
    ///
    /// # Arguments
    /// - `tokens`: A vector of token identifiers (e.g., ["ICP"])
    /// - `amounts`: A vector of corresponding amounts (e.g., [100_000_000])
    /// - `label`: A label for the asset information (e.g., "SEND_AIRDROP_ASSET")
    /// - `is_token_basket`: A boolean indicating if the link is a token basket
    ///
    /// # Returns
    /// - A vector of `LinkDetailUpdateAssetInfoInput` structs containing the transformed asset information.
    /// # Errors
    /// Returns an error if the tokens not found in the token map
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
                            asset: Asset::IC {
                                address: self.ctx.icp_ledger_principal,
                            },
                            label: format!("{}_{}", label, self.ctx.icp_ledger_principal.to_text()),
                            amount_per_link_use_action: amount,
                        })
                    } else {
                        Ok(LinkDetailUpdateAssetInfoInput {
                            asset: Asset::IC {
                                address: self.ctx.icp_ledger_principal,
                            },
                            label: label.to_string(),
                            amount_per_link_use_action: amount,
                        })
                    }
                }
                _ => match self.ctx.icrc_token_map.get(&token) {
                    Some(token_principal) => {
                        if is_token_basket {
                            Ok(LinkDetailUpdateAssetInfoInput {
                                asset: Asset::IC {
                                    address: *token_principal,
                                },
                                label: format!("{}_{}", label, token_principal.to_text()),
                                amount_per_link_use_action: amount,
                            })
                        } else {
                            Ok(LinkDetailUpdateAssetInfoInput {
                                asset: Asset::IC {
                                    address: *token_principal,
                                },
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

/// Creates a fixture for a tip link.
pub async fn create_tip_link_fixture(token: &str, amount: u64) -> (LinkTestFixture, LinkDto) {
    let mut builder = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger();

    if token != constant::ICP_TOKEN {
        builder = builder.with_icrc_tokens(vec![token.to_string()]);
    }

    let ctx = builder.build_async().await;
    let caller = TestUser::User1.get_principal();
    let mut creator_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

    let initial_balance = 1_000_000_000u64;
    //let tip_amount = 1_000_000u64;

    creator_fixture.airdrop_icp(initial_balance, &caller).await;
    if token != constant::ICP_TOKEN {
        creator_fixture
            .airdrop_icrc(token, initial_balance, &caller)
            .await;
    }

    let link = creator_fixture.create_tip_link(token, amount).await;
    let create_action = creator_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;
    let processing_action = creator_fixture
        .process_action(&link.id, &create_action.id, ActionType::CreateLink)
        .await;
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let _icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;
    let _update_action = creator_fixture
        .update_action(&link.id, &processing_action.id)
        .await;
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: LinkStateMachineGoto::Continue,
        params: None,
    };
    let update_link = creator_fixture.update_link(update_link_input).await;

    (creator_fixture, update_link)
}

/// Creates a fixture for a token basket link.
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

    let icp_initial_balance = 1_000_000_000u64;
    let ckbtc_initial_balance = 1_000_000_000u64;
    let ckusdc_initial_balance = 1_000_000_000u64;

    creator_fixture
        .airdrop_icp(icp_initial_balance, &caller)
        .await;
    creator_fixture
        .airdrop_icrc(constant::CKBTC_ICRC_TOKEN, ckbtc_initial_balance, &caller)
        .await;
    creator_fixture
        .airdrop_icrc(constant::CKUSDC_ICRC_TOKEN, ckusdc_initial_balance, &caller)
        .await;

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

    let link = creator_fixture.create_link(link_input).await;
    let create_action = creator_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;
    let processing_action = creator_fixture
        .process_action(&link.id, &create_action.id, ActionType::CreateLink)
        .await;
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let _icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;
    let _update_action = creator_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: LinkStateMachineGoto::Continue,
        params: None,
    };
    let update_link = creator_fixture.update_link(update_link_input).await;

    (creator_fixture, update_link)
}

/// Creates a fixture for an airdrop link.
pub async fn create_airdrop_link_fixture(
    token: &str,
    amount: u64,
    max_use_count: u64,
) -> (LinkTestFixture, LinkDto) {
    let mut builder = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger();

    if token != constant::ICP_TOKEN {
        builder = builder.with_icrc_tokens(vec![token.to_string()]);
    }

    let ctx = builder.build_async().await;
    let caller = TestUser::User1.get_principal();
    let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

    let initial_balance = 1_000_000_000u64;

    test_fixture.airdrop_icp(initial_balance, &caller).await;
    if token != constant::ICP_TOKEN {
        test_fixture
            .airdrop_icrc(token, initial_balance, &caller)
            .await;
    }

    let link_input = test_fixture
        .airdrop_link_input(vec![token.to_string()], vec![amount], max_use_count)
        .unwrap();

    let link = test_fixture.create_link(link_input).await;
    let create_action = test_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;
    let processing_action = test_fixture
        .process_action(&link.id, &create_action.id, ActionType::CreateLink)
        .await;
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let _icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;

    let _update_action = test_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: LinkStateMachineGoto::Continue,
        params: None,
    };
    let update_link = test_fixture.update_link(update_link_input).await;

    (test_fixture, update_link)
}

/// Create fixture for receive payment link
pub async fn create_receive_payment_link_fixture(
    token: &str,
    amount: u64,
) -> (LinkTestFixture, LinkDto) {
    let mut builder = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger();

    if token != constant::ICP_TOKEN {
        builder = builder.with_icrc_tokens(vec![token.to_string()]);
    }

    let ctx = builder.build_async().await;
    let caller = TestUser::User1.get_principal();
    let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

    let initial_balance = 1_000_000_000u64;
    test_fixture.airdrop_icp(initial_balance, &caller).await;

    let link_input = test_fixture
        .receive_payment_link_input(vec![token.to_string()], vec![amount])
        .unwrap();

    let link = test_fixture.create_link(link_input).await;

    let create_action = test_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;

    let processing_action = test_fixture
        .process_action(&link.id, &create_action.id, ActionType::CreateLink)
        .await;

    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

    let _icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;

    let _update_action = test_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: LinkStateMachineGoto::Continue,
        params: None,
    };
    let update_link = test_fixture.update_link(update_link_input).await;

    (test_fixture, update_link)
}

/// Create a fixture for receive payment which is already used
pub async fn create_and_use_receive_payment_link_fixture(
    token: &str,
    amount: u64,
) -> (LinkTestFixture, LinkDto) {
    let (creator_fixture, link) = create_receive_payment_link_fixture(token, amount).await;

    let claimer = TestUser::User2.get_principal();
    let mut claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;

    let initial_balance = 1_000_000_000u64;
    claimer_fixture.airdrop_icp(initial_balance, &claimer).await;

    if token != constant::ICP_TOKEN {
        claimer_fixture
            .airdrop_icrc(token, initial_balance, &claimer)
            .await;
    }

    let claim_action = claimer_fixture
        .create_action(&link.id, ActionType::Use)
        .await;
    let processing_action = claimer_fixture
        .process_action(&link.id, &claim_action.id, ActionType::Use)
        .await;
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let _icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, claimer, &claimer_fixture.ctx).await;
    let _update_action = claimer_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    (creator_fixture, link)
}
