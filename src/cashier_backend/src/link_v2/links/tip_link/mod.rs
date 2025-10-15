pub mod actions;
pub mod states;

use crate::{
    link_v2::{
        links::tip_link::actions::create::CreateAction,
        traits::{LinkV2, LinkV2State},
    },
    services::ext::icrc_batch::IcrcBatchService,
};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::CreateActionResult,
    repository::{
        action::v1::ActionType,
        asset_info::AssetInfo,
        common::Asset,
        link::v1::{Link, LinkState, LinkType},
    },
};
use states::created::CreatedState;
use std::{future::Future, pin::Pin};
use uuid::Uuid;

#[derive(Debug)]
pub struct TipLink {
    pub link: Link,
}

impl TipLink {
    pub fn new(link: Link) -> Self {
        Self { link }
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

        Self::new(new_link)
    }

    pub fn get_state_handler(link: &Link) -> Result<Box<dyn LinkV2State>, CanisterError> {
        match link.state {
            LinkState::CreateLink => Ok(Box::new(CreatedState::new(link))),
            _ => Err(CanisterError::from("Unsupported link state")),
        }
    }
}

impl LinkV2 for TipLink {
    fn get_link_model(&self) -> Link {
        self.link.clone()
    }

    fn create_action(
        &self,
        canister_id: Principal,
        action_type: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>> {
        let assets: Vec<Asset> = self
            .link
            .asset_info
            .iter()
            .map(|info| info.asset.clone())
            .collect();
        let link = self.link.clone();

        Box::pin(async move {
            let icrc_batch_service = IcrcBatchService::new();
            let fee_map = icrc_batch_service.get_batch_tokens_fee(&assets).await?;
            match action_type {
                ActionType::CreateLink => {
                    let create_action = CreateAction::create(link, fee_map, canister_id)?;
                    Ok(CreateActionResult {
                        action: create_action.action,
                        intents: create_action.intents,
                        intent_txs_map: create_action.intent_txs_map,
                    })
                }
                _ => Err(CanisterError::from("Unsupported action type")),
            }
        })
    }

    fn activate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();

        Box::pin(async move {
            let state = TipLink::get_state_handler(&link)?;
            state.activate().await
        })
    }
}
