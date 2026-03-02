// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::{v1::ActionType, v3::ActionV3},
        asset_info::v3::AssetInfoV3,
        intent::v3::IntentV3,
        link::{
            v1::LinkType,
            v3::{LinkState as LinkStateV3, LinkV3},
        },
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::v3::traits::TransactionManagerV3;
use uuid::Uuid;

use crate::apps::{
    link_v3::{
        links::shared::send_link::states::{
            active::ActiveState, created::CreatedState, inactive::InactiveState,
        },
        traits::{LinkV3Instance, LinkV3State},
    },
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct TokenBasketLink {
    pub link: LinkV3,
    pub canister_id: Principal,
}

impl TokenBasketLink {
    pub fn new(link: LinkV3, canister_id: Principal) -> Self {
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
        asset_info: Vec<AssetInfoV3>,
        max_use: u64,
        created_at: u64,
        canister_id: Principal,
    ) -> Self {
        let new_link = LinkV3 {
            id: Uuid::new_v4().to_string(),
            link_type: LinkType::SendTokenBasket,
            title,
            asset_info,
            max_use,
            use_count: 0,
            creator,
            state: LinkStateV3::Created,
            created_at,
        };

        Self::new(new_link, canister_id)
    }
}

impl LinkV3Instance for TokenBasketLink {
    /// Creates an action for the TipLink.
    /// # Arguments
    /// * `canister_id` - The canister ID of the token contract.
    /// * `action_type` - The type of action to be created.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>>` - A future that resolves to the resulting action or an error if the creation fails.
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match link.state {
            LinkStateV3::Created => {
                let state = CreatedState::new(&link, canister_id);
                state
                    .create_action(
                        caller,
                        action_type,
                        created_at,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        token_balance_service,
                    )
                    .await
            }
            LinkStateV3::Active => {
                let state = ActiveState::new(&link, canister_id);
                state
                    .create_action(
                        caller,
                        action_type,
                        created_at,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        token_balance_service,
                    )
                    .await
            }
            LinkStateV3::Inactive => {
                let state = InactiveState::new(&link, canister_id);
                state
                    .create_action(
                        caller,
                        action_type,
                        created_at,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        token_balance_service,
                    )
                    .await
            }
            _ => Err(CanisterError::HandleLogicError(format!(
                "Cannot create action for link in state {:?}",
                link.state
            ))),
        }
    }

    async fn process_action<M>(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match link.state {
            LinkStateV3::Created => {
                let state = CreatedState::new(&link, canister_id);
                let process_action_result = state
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await?;
                return Ok(process_action_result);
            }
            LinkStateV3::Active => {
                let state = ActiveState::new(&link, canister_id);
                let process_action_result = state
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await?;
                return Ok(process_action_result);
            }
            LinkStateV3::Inactive => {
                let state = InactiveState::new(&link, canister_id);
                let process_action_result = state
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await?;
                return Ok(process_action_result);
            }
            _ => {
                return Err(CanisterError::HandleLogicError(format!(
                    "Cannot process action for link in state {:?}",
                    link.state
                )));
            }
        }
    }
}
