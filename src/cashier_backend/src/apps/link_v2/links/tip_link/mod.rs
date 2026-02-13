// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::v1::{Action, ActionType},
        asset_info::AssetInfo,
        intent::v1::Intent,
        link::v1::{Link, LinkState, LinkType},
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::traits::TransactionManager;
use uuid::Uuid;

use crate::apps::{
    link_v2::links::{
        shared::send_link::states::{
            active::ActiveState, created::CreatedState, inactive::InactiveState,
        },
        traits::{LinkV2, LinkV2State},
    },
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct TipLink {
    pub link: Link,
    pub canister_id: Principal,
}

impl TipLink {
    pub fn new(link: Link, canister_id: Principal) -> Self {
        Self { link, canister_id }
    }

    /// Create a new TipLink instance
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `title` - The title of the link
    /// * `asset_info` - The asset information associated with the link
    /// * `max_use` - The maximum number of times the link can be used
    /// * `created_at_ts` - The timestamp when the link is created
    /// # Returns
    /// * `TipLink` - The newly created TipLink instance
    pub fn create(
        creator: Principal,
        title: String,
        asset_info: Vec<AssetInfo>,
        max_use: u64,
        created_at_ts: u64,
        canister_id: Principal,
    ) -> Self {
        let new_link = Link {
            id: Uuid::new_v4().to_string(),
            link_type: LinkType::SendTip,
            title,
            asset_info,
            link_use_action_counter: 0,
            link_use_action_max_count: max_use,
            creator,
            state: LinkState::CreateLink,
            create_at: created_at_ts,
        };

        Self::new(new_link, canister_id)
    }
}

impl LinkV2 for TipLink {
    /// Creates an action for the TipLink.
    /// # Arguments
    /// * `canister_id` - The canister ID of the token contract.
    /// * `action_type` - The type of action to be created.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>>` - A future that resolves to the resulting action or an error if the creation fails.
    async fn create_action<M, F, S>(
        &self,
        caller: Principal,
        action_type: ActionType,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match link.state {
            LinkState::CreateLink => {
                let state_handler = CreatedState::new(&link, canister_id);
                state_handler
                    .create_action(
                        caller,
                        action_type,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                    )
                    .await
            }
            LinkState::Active => {
                let state_handler = ActiveState::new(&link, canister_id);
                state_handler
                    .create_action(
                        caller,
                        action_type,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                    )
                    .await
            }
            LinkState::Inactive => {
                let state_handler = InactiveState::new(&link, canister_id);
                state_handler
                    .create_action(
                        caller,
                        action_type,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                    )
                    .await
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for current link state".to_string(),
            )),
        }
    }

    async fn process_action<M>(
        &self,
        caller: Principal,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match link.state {
            LinkState::CreateLink => {
                let state_handler = CreatedState::new(&link, canister_id);
                state_handler
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkState::Active => {
                let state_handler = ActiveState::new(&link, canister_id);
                state_handler
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkState::Inactive => {
                let state_handler = InactiveState::new(&link, canister_id);
                state_handler
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for current link state".to_string(),
            )),
        }
    }
}
