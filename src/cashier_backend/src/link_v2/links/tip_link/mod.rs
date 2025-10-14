pub mod actions;
pub mod states;

use crate::link_v2::{
    links::tip_link::actions::create::CreateAction,
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
}

impl TipLink {
    pub fn new(link: Link) -> Self {
        Self { link }
    }

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
        caller: candid::Principal,
        action_type: ActionType,
        created_at_ts: u64,
    ) -> Result<CreateActionResult, CanisterError> {
        match action_type {
            ActionType::CreateLink => {
                let create_action =
                    CreateAction::create(self.link.id.clone(), caller, created_at_ts)?;
                Ok(CreateActionResult {
                    action: create_action.action,
                    intents: create_action.intents,
                    intent_txs_map: create_action.intent_txs_map,
                })
            }
            _ => Err(CanisterError::from("Unsupported action type")),
        }
    }

    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();

        Box::pin(async move {
            let state = TipLink::get_state_handler(&link)?;
            state.publish().await
        })
    }
}
