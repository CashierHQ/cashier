// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod states;

use crate::apps::link_v3::traits::{LinkV3, LinkV3State};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::action_result::CreateActionResult,
    link_v3::link_result::LinkCreateActionResult,
    repository::{
        action::v1::{Action, ActionType},
        asset_info::AssetInfo,
        intent::v1::Intent,
        link::v1::{Link, LinkState, LinkType},
        transaction::v1::Transaction,
    },
};
use cashier_shared::types::Action as ActionShared;
use states::created::CreatedState;
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};
use transaction_manager::traits::TransactionManagerV3;
use uuid::Uuid;

pub struct TipLink<M: TransactionManagerV3 + 'static> {
    pub link: Link,
    pub canister_id: Principal,
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManagerV3 + 'static> TipLink<M> {
    pub fn new(link: Link, canister_id: Principal, transaction_manager: Rc<M>) -> Self {
        Self {
            link,
            canister_id,
            transaction_manager,
        }
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
        transaction_manager: Rc<M>,
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

        Self::new(new_link, canister_id, transaction_manager)
    }

    /// Get the appropriate state handler for the current link state
    /// # Arguments
    /// * `link` - The Link model
    /// * `canister_id` - The canister ID of the token contract
    /// * `fee_map` - A map of canister principals to their corresponding fees
    /// # Returns
    /// * `Result<Box<dyn LinkV3State>, CanisterError>` - The resulting state handler or an error if the state is unsupported
    pub fn get_state_handler(
        link: &Link,
        canister_id: Principal,
        transaction_manager: Rc<M>,
    ) -> Result<Box<dyn LinkV3State>, CanisterError> {
        Ok(Box::new(CreatedState::new(
            link,
            canister_id,
            transaction_manager,
        )))
    }
}

impl<M: TransactionManagerV3 + 'static> LinkV3 for TipLink<M> {
    /// Creates an action for the TipLink.
    /// # Arguments
    /// * `canister_id` - The canister ID of the token contract.
    /// * `action_type` - The type of action to be created.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>>` - A future that resolves to the resulting action or an error if the creation fails.
    fn create_action(
        &self,
        caller: Principal,
        action: ActionShared,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let canister_id = self.canister_id;
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            let state = TipLink::get_state_handler(&link, canister_id, transaction_manager)?;
            let create_action_result = state.create_action(caller, action).await?;
            Ok(create_action_result)
        })
    }
}
