// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::utils::{PocketIcTestContext, principal::TestUser};
use candid::{Nat, Principal};
use cashier_backend_client::client::CashierBackendClient;
use cashier_backend_types::{
    constant,
    dto::{
        action::{ActionDto, CreateActionInput},
        link::{
            CreateLinkInput, GetLinkOptions, GetLinkResp, LinkDetailUpdateAssetInfoInput, LinkDto,
        },
    },
    error::CanisterError,
    link_v2::dto::{CreateLinkDto, ProcessActionDto, ProcessActionV2Input},
    link_v3::dto::{
        action::{
            CreateActionInputV3, CreateActionResponseV3, ProcessActionInputV3,
            ProcessActionResponseV3,
        },
        link::{
            CreateLinkInputV3, CreateLinkResponseV3, DisableLinkResponseV3, GetLinkResponseV3,
            GetLinksResponseV3,
        },
    },
    repository::asset::v1::Asset,
    service::link::{PaginateInput, PaginateResult},
};
use ic_mple_client::PocketIcClient;
use icrc_ledger_types::icrc1::account::Account;
use std::{sync::Arc, time::Duration};

#[derive(Clone)]
pub struct LinkTestFixtureV3 {
    pub ctx: Arc<PocketIcTestContext>,
    pub cashier_backend_client: Option<CashierBackendClient<PocketIcClient>>,
}

impl LinkTestFixtureV3 {
    pub async fn new(ctx: Arc<PocketIcTestContext>, caller: Principal) -> Self {
        // Initialize the cashier backend client with the provided caller
        let cashier_backend_client = Some(ctx.new_cashier_backend_client(caller));

        // call twice for `raw_rand`` work or else `raw_rand``` api will return error
        // more info https://forum.dfinity.org/t/pocket-ic-support-for-management-canister-calls-and-timers/25676/2
        ctx.advance_time(Duration::from_secs(1)).await;
        ctx.advance_time(Duration::from_secs(1)).await;

        Self {
            ctx,
            cashier_backend_client,
        }
    }

    /// Create link v3
    /// # Arguments
    /// * `input` - The input data for creating the link
    /// # Returns
    /// * `CreateLinkResponseV3` - The created link data
    pub async fn create_link_v3(&self, input: CreateLinkInputV3) -> CreateLinkResponseV3 {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_create_link_v3(input)
            .await
            .unwrap()
            .unwrap()
    }

    /// Activate link v3
    /// # Arguments
    /// * `link_id` - The ID of the link to activate
    /// # Returns
    /// * `LinkDto` - The activated link data
    pub async fn activate_link_v3(
        &self,
        link_id: &str,
        action_id: &str,
    ) -> Result<ProcessActionResponseV3, CanisterError> {
        let process_action_input = ProcessActionInputV3 {
            link_id: link_id.to_string(),
            action_id: action_id.to_string(),
        };

        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_process_action_v3(process_action_input)
            .await
            .unwrap()
    }

    /// Disable link v3
    /// # Arguments
    /// * `link_id` - The ID of the link to disable
    /// # Returns
    /// * `LinkDto` - The disabled link data
    pub async fn disable_link_v3(&self, link_id: &str) -> Result<LinkDto, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_disable_link_v3(link_id)
            .await
            .unwrap()
    }

    /// Create action v3
    /// # Arguments
    /// * `input` - The input data for creating the action
    /// # Returns
    /// * `ActionDto` - The created action data
    /// * `CanisterError` - Error if the action creation fails
    pub async fn create_action_v3(
        &self,
        input: CreateActionInputV3,
    ) -> Result<CreateActionResponseV3, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_create_action_v3(input)
            .await
            .unwrap()
    }

    /// Process action v3
    /// # Arguments
    /// * `input` - The input data for processing the action
    /// # Returns
    /// * `ProcessActionDto` - The processed action data
    /// * `CanisterError` - Error if the action processing fails
    pub async fn process_action_v3(
        &self,
        input: ProcessActionInputV3,
    ) -> Result<ProcessActionResponseV3, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_process_action_v3(input)
            .await
            .unwrap()
    }

    /// Get links v3
    /// # Arguments
    /// * `options` - Optional pagination input
    /// # Returns
    /// * `PaginateResult<LinkDto>` - The paginated list of links
    /// * `CanisterError` - Error if the retrieval fails
    pub async fn user_get_links_v3(
        &self,
        options: Option<PaginateInput>,
    ) -> Result<PaginateResult<GetLinksResponseV3>, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_get_links_v3(options)
            .await
            .unwrap()
    }

    /// Get link details v3
    /// # Arguments
    /// * `link_id` - The ID of the link to retrieve details for
    /// * `options` - Optional parameters for retrieving link details
    /// # Returns
    /// * `GetLinkResp` - The link details response
    /// * `CanisterError` - Error if the retrieval fails
    pub async fn get_link_details_v3(
        &self,
        link_id: &str,
        options: Option<GetLinkOptions>,
    ) -> Result<GetLinkResponseV3, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .get_link_details_v3(link_id, options)
            .await
            .unwrap()
    }

    /// This function is used to airdrop ICP to the user.
    /// # Arguments
    /// * `amount` - The amount of ICP to airdrop
    /// * `to_user` - The principal of the user to receive the airdrop
    /// # Returns
    /// * `()` - No return value
    pub async fn airdrop_icp(&mut self, amount: Nat, to_user: &Principal) -> () {
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

    /// This function is used to airdrop ICRC tokens to the user.
    /// # Arguments
    /// * `token_name` - The name of the ICRC token
    /// * `amount` - The amount of tokens to airdrop
    /// * `to_user` - The principal of the user to receive the airdrop
    /// # Returns
    /// * `()` - No return value
    pub async fn airdrop_icrc(&mut self, token_name: &str, amount: Nat, to_user: &Principal) -> () {
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
    pub fn asset_info_from_tokens_and_amount(
        &self,
        tokens: Vec<String>,
        amounts: Vec<Nat>,
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
