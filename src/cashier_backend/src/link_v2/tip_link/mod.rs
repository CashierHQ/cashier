pub mod actions;
pub mod states;

use crate::link_v2::traits::{LinkV2, LinkV2State};
use candid::Principal;
use cashier_backend_types::{
    dto::{
        action::ActionDto,
        link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput},
    },
    error::CanisterError,
    repository::{
        action::v1::ActionType,
        asset_info::AssetInfo,
        link::v1::{Link, LinkState},
    },
};
use states::{
    active::ActiveState, created::CreatedState, inactive::InactiveState,
    inactive_ended::InactiveEndedState,
};
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

    pub fn create(creator: Principal, input: CreateLinkInput, created_at_ts: u64) -> Self {
        let id = Uuid::new_v4();
        let link_id_str = id.to_string();

        let asset_info: Vec<AssetInfo> = input
            .asset_info
            .iter()
            .map(LinkDetailUpdateAssetInfoInput::to_model)
            .collect();

        let new_link = Link {
            id: link_id_str,
            state: LinkState::CreateLink,
            title: input.title,
            link_type: input.link_type,
            asset_info,
            creator,
            create_at: created_at_ts,
            link_use_action_counter: 0,
            link_use_action_max_count: input.link_use_action_max_count,
        };

        Self::new(new_link)
    }

    pub fn create_state(link: &Link) -> Box<dyn LinkV2State> {
        match link.state {
            LinkState::CreateLink => Box::new(CreatedState::new(link)),
            LinkState::Active => Box::new(ActiveState::new(link)),
            LinkState::Inactive => Box::new(InactiveState::new(link)),
            LinkState::InactiveEnded => Box::new(InactiveEndedState::new(link)),
        }
    }
}

impl LinkV2 for TipLink {
    fn get_link_data(&self) -> Link {
        self.link.clone()
    }

    fn create_action(
        &self,
        caller: candid::Principal,
        action_input: ActionType,
    ) -> Result<ActionDto, CanisterError> {
        Err(CanisterError::from("create_action not implemented"))
    }

    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();

        Box::pin(async move {
            let state = TipLink::create_state(&link);
            state.publish().await
        })
    }
    fn unpublish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();
        Box::pin(async move {
            let state = TipLink::create_state(&link);
            state.unpublish().await
        })
    }
    fn claim(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();
        Box::pin(async move {
            let state = TipLink::create_state(&link);
            state.claim().await
        })
    }
    fn withdraw(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let link = self.link.clone();
        Box::pin(async move {
            let state = TipLink::create_state(&link);
            state.withdraw().await
        })
    }
}
