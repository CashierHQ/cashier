// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod actions;
pub mod states;

use crate::link_v2::{
    links::tip_link::{
        actions::{claim::ClaimAction, create::CreateAction, withdraw::WithdrawAction},
        states::{active::ActiveState, ended::EndedState, inactive::InactiveState},
    },
    traits::{LinkV2, LinkV2State},
};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::CreateActionResult,
    repository::{
        action::v1::ActionType,
        asset_info::AssetInfo,
        link::v1::{Link, LinkState, LinkType},
    },
};
use states::created::CreatedState;
use std::{future::Future, pin::Pin};
use uuid::Uuid;

#[derive(Debug)]
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

    /// Get the appropriate state handler for the current link state
    /// # Arguments
    /// * `link` - The Link model
    /// * `canister_id` - The canister ID of the token contract
    /// * `fee_map` - A map of canister principals to their corresponding fees
    /// # Returns
    /// * `Result<Box<dyn LinkV2State>, CanisterError>` - The resulting state handler or an error if the state is unsupported
    pub fn get_state_handler(
        link: &Link,
        canister_id: Principal,
    ) -> Result<Box<dyn LinkV2State>, CanisterError> {
        match link.state {
            LinkState::CreateLink => Ok(Box::new(CreatedState::new(link, canister_id))),
            LinkState::Active => Ok(Box::new(ActiveState::new(link))),
            LinkState::Inactive => Ok(Box::new(InactiveState::new(link))),
            LinkState::InactiveEnded => Ok(Box::new(EndedState::new(link))),
        }
    }
}

impl LinkV2 for TipLink {
    fn get_link_model(&self) -> Link {
        self.link.clone()
    }

    /// Creates an action for the TipLink.
    /// # Arguments
    /// * `canister_id` - The canister ID of the token contract.
    /// * `action_type` - The type of action to be created.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>>` - A future that resolves to the resulting action or an error if the creation fails.
    fn create_action(
        &self,
        _caller: Principal,
        canister_id: Principal,
        action_type: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>> {
        let link = self.link.clone();

        Box::pin(async move {
            match action_type {
                ActionType::CreateLink => {
                    let create_action = CreateAction::create(&link, canister_id).await?;
                    Ok(CreateActionResult {
                        action: create_action.action,
                        intents: create_action.intents,
                        intent_txs_map: create_action.intent_txs_map,
                        icrc112_requests: create_action.icrc112_requests,
                    })
                }
                ActionType::Withdraw => {
                    let withdraw_action = WithdrawAction::create(&link, canister_id).await?;
                    Ok(CreateActionResult {
                        action: withdraw_action.action,
                        intents: withdraw_action.intents,
                        intent_txs_map: withdraw_action.intent_txs_map,
                        icrc112_requests: withdraw_action.icrc112_requests,
                    })
                }
                ActionType::Claim => {
                    let claim_action = ClaimAction::create(&link, canister_id).await?;
                    Ok(CreateActionResult {
                        action: claim_action.action,
                        intents: claim_action.intents,
                        intent_txs_map: claim_action.intent_txs_map,
                        icrc112_requests: claim_action.icrc112_requests,
                    })
                }
                _ => Err(CanisterError::from("Unsupported action type")),
            }
        })
    }

    /// Activates the TipLink.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>>` - A future that resolves to the activated link or an error if the activation fails.
    fn activate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        Box::pin(async move {
            let state = TipLink::get_state_handler(&link, canister_id)?;
            state.activate().await
        })
    }

    fn deactivate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        Box::pin(async move {
            let state = TipLink::get_state_handler(&link, canister_id)?;
            state.deactivate().await
        })
    }
}
