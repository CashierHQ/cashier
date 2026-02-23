// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repository::{asset_info::v3::AssetInfoV3, link::v1::LinkType};

use candid::{CandidType, Principal};
use cashier_macros::storable;
use cashier_shared::types::{
    Link as LinkShared, LinkState as LinkStateShared, LinkType as LinkTypeShared,
};
use derive_more::Display;
use ic_mple_structures::Codec;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
#[storable]
pub struct LinkV3 {
    pub id: String,
    pub title: String,
    pub link_type: LinkType,
    pub asset_info: Vec<AssetInfoV3>,
    pub max_use: u64,
    pub use_count: u64,
    pub creator: Principal,
    pub state: LinkState,
    pub created_at: u64,
}

#[storable]
pub enum LinkCodecV3 {
    V1(LinkV3),
}

impl Codec<LinkV3> for LinkCodecV3 {
    fn decode(source: Self) -> LinkV3 {
        match source {
            LinkCodecV3::V1(link) => link,
        }
    }

    fn encode(dest: LinkV3) -> Self {
        LinkCodecV3::V1(dest)
    }
}

impl From<LinkShared> for LinkV3 {
    fn from(link: LinkShared) -> Self {
        LinkV3 {
            id: link.id,
            title: link.title,
            link_type: LinkType::from(link.link_type),
            asset_info: link.asset_info.into_iter().map(AssetInfoV3::from).collect(),
            max_use: link.max_use,
            use_count: link.use_count,
            creator: link.creator,
            state: LinkState::from(link.link_state),
            created_at: 0,
        }
    }
}

impl LinkV3 {
    pub fn to_shared(&self) -> LinkShared {
        LinkShared {
            id: self.id.clone(),
            title: self.title.clone(),
            link_type: self.link_type.to_shared(),
            asset_info: self
                .asset_info
                .iter()
                .map(|asset| asset.to_shared())
                .collect(),
            max_use: self.max_use,
            use_count: self.use_count,
            creator: self.creator,
            link_state: self.state.to_shared(),
            created_at_ts: Some(self.created_at),
        }
    }
}

impl From<LinkTypeShared> for LinkType {
    fn from(link_type: LinkTypeShared) -> Self {
        match link_type {
            LinkTypeShared::SendTip => LinkType::SendTip,
            LinkTypeShared::SendAirdrop => LinkType::SendAirdrop,
            LinkTypeShared::SendTokenBasket => LinkType::SendTokenBasket,
            LinkTypeShared::ReceivePayment => LinkType::ReceivePayment,
        }
    }
}

impl LinkType {
    pub fn to_shared(&self) -> LinkTypeShared {
        match self {
            LinkType::SendTip => LinkTypeShared::SendTip,
            LinkType::SendAirdrop => LinkTypeShared::SendAirdrop,
            LinkType::SendTokenBasket => LinkTypeShared::SendTokenBasket,
            LinkType::ReceivePayment => LinkTypeShared::ReceivePayment,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, CandidType, Display)]
pub enum LinkState {
    Created,
    Active,
    Inactive,
    Ended,
}

impl From<LinkStateShared> for LinkState {
    fn from(link_state: LinkStateShared) -> Self {
        match link_state {
            LinkStateShared::Created => LinkState::Created,
            LinkStateShared::Active => LinkState::Active,
            LinkStateShared::Inactive => LinkState::Inactive,
            LinkStateShared::Ended => LinkState::Ended,
        }
    }
}

impl LinkState {
    pub fn to_shared(&self) -> LinkStateShared {
        match self {
            LinkState::Created => LinkStateShared::Created,
            LinkState::Active => LinkStateShared::Active,
            LinkState::Inactive => LinkStateShared::Inactive,
            LinkState::Ended => LinkStateShared::Ended,
        }
    }
}
