// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_client::client::CashierBackendClient;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::{
        action::{
            CreateActionInputV3, CreateActionResponseV3, ProcessActionInputV3,
            ProcessActionResponseV3,
        },
        link::{
            CreateLinkInputV3, CreateLinkResponseV3, CreateLinkWithGateResponseV3,
            DisableLinkResponseV3, GetLinkDetailsResponseV3, GetLinkResponseV3, GetLinksResponseV3,
            SyncAssetBalanceCacheResponseV3,
        },
    },
    service::link::PaginateInput,
};
use cashier_common::{constant::CREATE_LINK_FEE, fee_calculator::icrc2};
use cashier_shared::types::{
    Action as ActionShared, ActionState as ActionStateShared, ActionType as ActionTypeShared,
    AddressType as AddressTypeShared, Asset as AssetShared, Intent as IntentShared,
    IntentState as IntentStateShared, IntentType as IntentTypeShared,
    TokenStandard as TokenStandardShared,
};
use gate_service_types::{GateKey, OpenGateSuccessResult};
use ic_mple_client::PocketIcClient;
use icrc_ledger_types::icrc1::account::Account;
use std::{sync::Arc, time::Duration};

use crate::{
    constant::treasury_principal,
    utils::{PocketIcTestContext, principal::TestUser},
};

#[derive(Clone)]
pub struct LinkTestFixtureV3 {
    pub ctx: Arc<PocketIcTestContext>,
    pub cashier_backend_client: Option<CashierBackendClient<PocketIcClient>>,
    pub icp_ledger_fee: Nat,
}

impl LinkTestFixtureV3 {
    pub async fn new(
        ctx: Arc<PocketIcTestContext>,
        caller: Principal,
        icp_ledger_fee: Nat,
    ) -> Self {
        // Initialize the cashier backend client with the provided caller
        let cashier_backend_client = Some(ctx.new_cashier_backend_client(caller));

        // call twice for `raw_rand`` work or else `raw_rand``` api will return error
        // more info https://forum.dfinity.org/t/pocket-ic-support-for-management-canister-calls-and-timers/25676/2
        ctx.advance_time(Duration::from_secs(1)).await;
        ctx.advance_time(Duration::from_secs(1)).await;

        Self {
            ctx,
            cashier_backend_client,
            icp_ledger_fee,
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
        action_id: &str,
    ) -> Result<ProcessActionResponseV3, CanisterError> {
        let process_action_input = ProcessActionInputV3 {
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
    pub async fn disable_link_v3(
        &self,
        link_id: &str,
    ) -> Result<DisableLinkResponseV3, CanisterError> {
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
    /// * `CreateActionResponseV3` - The created action data
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
    /// * `ProcessActionResponseV3` - The processed action data
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
    /// * `GetLinksResponseV3` - The paginated list of links
    /// * `CanisterError` - Error if the retrieval fails
    pub async fn user_get_links_v3(
        &self,
        options: Option<PaginateInput>,
    ) -> Result<GetLinksResponseV3, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_get_links_v3(options)
            .await
            .unwrap()
    }

    /// Sync asset balance cache v3
    /// # Arguments
    /// * `link_id` - The ID of the link to sync
    /// # Returns
    /// * `SyncAssetBalanceCacheResponseV3` - The updated link data
    /// * `CanisterError` - Error if the sync fails
    pub async fn sync_asset_balance_cache_v3(
        &self,
        link_id: &str,
    ) -> Result<SyncAssetBalanceCacheResponseV3, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_sync_asset_balance_cache(link_id)
            .await
            .unwrap()
    }

    /// Get link details v3
    /// # Arguments
    /// * `link_id` - The ID of the link to retrieve details for
    /// * `options` - Optional parameters for retrieving link details
    /// # Returns
    /// * `GetLinkResponseV3` - The link details response
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

    /// Creates a new link V3 with zero or more gates applied simultaneously.
    /// # Arguments
    /// * `input` - Link creation data
    /// * `gate_keys` - Gate keys to attach (empty = ungated link)
    /// # Returns
    /// * `CreateLinkWithGateResponseV3` - Created link, action, icrc112 requests, and gates
    pub async fn create_link_v3_with_gates(
        &self,
        input: CreateLinkInputV3,
        gate_keys: Vec<GateKey>,
    ) -> Result<CreateLinkWithGateResponseV3, CanisterError> {
        let keys = if gate_keys.is_empty() {
            None
        } else {
            Some(gate_keys)
        };
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_create_link_v3_with_gates(input, keys)
            .await
            .unwrap()
    }

    /// Opens a gate for the caller on the specified link.
    /// # Arguments
    /// * `link_id` - The link ID
    /// * `gate_id` - The gate ID (obtained from `get_link_details_v3_extended`)
    /// * `gate_key` - The key to open the gate
    /// # Returns
    /// * `Ok(OpenGateSuccessResult)` - Gate and updated user status on success
    /// * `Err(CanisterError)` - If the key is wrong or gate not found
    pub async fn open_link_gate(
        &self,
        link_id: &str,
        gate_id: &str,
        gate_key: GateKey,
    ) -> Result<OpenGateSuccessResult, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_open_link_gate(link_id, gate_id, gate_key)
            .await
            .unwrap()
    }

    /// Returns link details with gate metadata and the caller's gate open status.
    /// # Arguments
    /// * `link_id` - The link ID
    /// * `options` - Optional action type to include in response
    /// # Returns
    /// * `Ok(GetLinkDetailsResponseV3)` - Link data with gate info
    /// * `Err(CanisterError)` - If link not found
    pub async fn get_link_details_v3_extended(
        &self,
        link_id: &str,
        options: Option<GetLinkOptions>,
    ) -> Result<GetLinkDetailsResponseV3, CanisterError> {
        self.cashier_backend_client
            .as_ref()
            .unwrap()
            .user_get_link_details_v3(link_id, options)
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

    /// Create a mock CreateLink action for testing purposes.
    /// # Arguments
    /// * `creator` - The principal of the action creator
    /// * `tokens` - A vector of token identifiers (e.g., "ICP")
    /// * `amounts` - A vector of amounts corresponding to each token
    /// * `token_fees` - A vector of network fees corresponding to each token
    /// # Returns
    /// * `Ok(ActionShared)` - The created CreateLink action
    /// * `Err(String)` - Error message if the input vectors have mismatched lengths or if a token is not found
    pub fn create_action_from_tokens_and_amount(
        &self,
        creator: Principal,
        tokens: Vec<String>,
        amounts: Vec<Nat>,
        token_fees: Vec<Nat>,
    ) -> Result<ActionShared, String> {
        if tokens.len() != amounts.len() || tokens.len() != token_fees.len() {
            return Err(format!(
                "Tokens, amounts, and token_fees must have the same length: {} vs {} vs {}",
                tokens.len(),
                amounts.len(),
                token_fees.len()
            ));
        }

        let mut intents: Vec<IntentShared> = Vec::new();

        let fee_intent = IntentShared {
            id: "fee_intent".to_string(),
            intent_type: IntentTypeShared::Send,
            asset: AssetShared {
                address: self.ctx.icp_ledger_principal,
                network_fee: None,
                token_standard: Some(TokenStandardShared::ICRC2),
            },
            amount: Nat::from(CREATE_LINK_FEE),
            total_amount: Some(Nat::from(CREATE_LINK_FEE)),
            network_fee: Some(Nat::from(2u64) * self.icp_ledger_fee.clone()),
            user_fee: None,
            source_address: creator,
            source_address_type: AddressTypeShared::Creator,
            dest_address: treasury_principal(),
            dest_address_type: AddressTypeShared::Treasury,
            dependencies: None,
            action_id: None,
            intent_state: IntentStateShared::Created,
        };

        let asset_intents: Vec<IntentShared> = tokens
            .into_iter()
            .zip(amounts)
            .zip(token_fees)
            .map(|((token, amount), token_fee)| match token.as_str() {
                crate::constant::ICP_TOKEN => Ok(IntentShared {
                    id: "intent_id".to_string(),
                    asset: AssetShared {
                        address: self.ctx.icp_ledger_principal,
                        network_fee: None,
                        token_standard: Some(TokenStandardShared::ICRC2),
                    },
                    intent_type: IntentTypeShared::Send,
                    amount: amount.clone(),
                    total_amount: Some(icrc2::total_amount_icrc2_send_intent(
                        amount,
                        token_fee.clone(),
                        1,
                    )),
                    network_fee: Some(icrc2::network_fee_icrc2_send_intent(token_fee, 1)),
                    user_fee: None,
                    source_address: creator,
                    source_address_type: AddressTypeShared::Creator,
                    dest_address: self.ctx.cashier_backend_principal,
                    dest_address_type: AddressTypeShared::Link,
                    dependencies: None,
                    action_id: None,
                    intent_state: IntentStateShared::Created,
                }),
                _ => match self.ctx.icrc_token_map.get(&token) {
                    Some(token_principal) => Ok(IntentShared {
                        id: "intent_id".to_string(),
                        asset: AssetShared {
                            address: *token_principal,
                            network_fee: None,
                            token_standard: Some(TokenStandardShared::ICRC2),
                        },
                        intent_type: IntentTypeShared::Send,
                        amount: amount.clone(),
                        total_amount: Some(icrc2::total_amount_icrc2_send_intent(
                            amount,
                            token_fee.clone(),
                            1,
                        )),
                        network_fee: Some(icrc2::network_fee_icrc2_send_intent(token_fee, 1)),
                        user_fee: None,
                        source_address: creator,
                        source_address_type: AddressTypeShared::Creator,
                        dest_address: self.ctx.cashier_backend_principal,
                        dest_address_type: AddressTypeShared::Link,
                        dependencies: None,
                        action_id: None,
                        intent_state: IntentStateShared::Created,
                    }),
                    None => Err(format!("Token {} not found in icrc_token_map", token)),
                },
            })
            .collect::<Result<Vec<_>, _>>()?;

        intents.push(fee_intent);
        intents.extend(asset_intents);

        Ok(ActionShared {
            id: "action_id".to_string(),
            action_type: ActionTypeShared::CreateLink,
            intents,
            creator,
            creator_address_type: AddressTypeShared::Creator,
            action_state: ActionStateShared::Created,
            link_id: None,
            intent_ids: None,
        })
    }

    /// Create a mock Receive action for testing purposes.
    /// # Arguments
    /// * `link_id` - The ID of the link associated with the action
    /// * `creator` - The principal of the action creator
    /// # Returns
    /// * `ActionShared` - The created Receive action
    pub fn receive_action(&self, link_id: String, creator: Principal) -> ActionShared {
        ActionShared {
            id: "receive_action_id".to_string(),
            action_type: ActionTypeShared::Receive,
            intents: vec![],
            creator,
            creator_address_type: AddressTypeShared::User,
            action_state: ActionStateShared::Created,
            link_id: Some(link_id),
            intent_ids: None,
        }
    }

    /// Create a mock Withdraw action for testing purposes.
    /// # Arguments
    /// * `link_id` - The ID of the link associated with the action
    /// * `creator` - The principal of the action creator
    /// # Returns
    /// * `ActionShared` - The created Withdraw action
    pub fn withdraw_action(&self, link_id: String, creator: Principal) -> ActionShared {
        ActionShared {
            id: "withdraw_action_id".to_string(),
            action_type: ActionTypeShared::Withdraw,
            intents: vec![],
            creator,
            creator_address_type: AddressTypeShared::Creator,
            action_state: ActionStateShared::Created,
            link_id: Some(link_id),
            intent_ids: None,
        }
    }
}
