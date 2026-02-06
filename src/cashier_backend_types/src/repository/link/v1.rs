// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repository::asset_info::AssetInfo;
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
pub struct Link {
    pub id: String,
    pub state: LinkState,
    pub title: String,
    pub link_type: LinkType,
    pub asset_info: Vec<AssetInfo>,
    pub creator: Principal,
    pub create_at: u64,
    pub link_use_action_counter: u64,
    pub link_use_action_max_count: u64,
}

#[storable]
pub enum LinkCodec {
    V1(Link),
}

impl Codec<Link> for LinkCodec {
    fn decode(source: Self) -> Link {
        match source {
            LinkCodec::V1(link) => link,
        }
    }

    fn encode(dest: Link) -> Self {
        LinkCodec::V1(dest)
    }
}

impl Link {
    pub fn get_asset_by_label(&self, label: &str) -> Option<AssetInfo> {
        self.asset_info
            .iter()
            .find(|asset| asset.label == label)
            .cloned()
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, CandidType, Display)]
pub enum LinkType {
    SendTip,
    SendAirdrop,
    SendTokenBasket,
    ReceivePayment,
}

impl From<LinkTypeShared> for LinkType {
    fn from(link_type: LinkTypeShared) -> Self {
        match link_type {
            LinkTypeShared::TipLink => LinkType::SendTip,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, CandidType, Display)]
pub enum LinkState {
    CreateLink,
    Active,
    Inactive,
    InactiveEnded,
}

impl From<LinkStateShared> for LinkState {
    fn from(link_state: LinkStateShared) -> Self {
        match link_state {
            LinkStateShared::Created => LinkState::CreateLink,
            LinkStateShared::Active => LinkState::Active,
            LinkStateShared::Inactive => LinkState::Inactive,
            LinkStateShared::InactiveEnded => LinkState::InactiveEnded,
        }
    }
}

impl Link {
    pub fn into_generated(&self) -> LinkShared {
        LinkShared {
            id: self.id.clone(),
            title: self.title.clone(),
            link_type: match self.link_type {
                LinkType::SendTip => LinkTypeShared::TipLink,
                LinkType::SendAirdrop => unimplemented!(),
                LinkType::SendTokenBasket => unimplemented!(),
                LinkType::ReceivePayment => unimplemented!(),
            },
            asset_info: self
                .asset_info
                .iter()
                .map(|asset| asset.into_generated())
                .collect(),
            use_count: self.link_use_action_counter,
            max_use: self.link_use_action_max_count,
            creator: self.creator,
            created_at_ts: self.create_at,
            link_state: match self.state {
                LinkState::CreateLink => LinkStateShared::Created,
                LinkState::Active => LinkStateShared::Active,
                LinkState::Inactive => LinkStateShared::Inactive,
                LinkState::InactiveEnded => LinkStateShared::InactiveEnded,
            },
        }
    }
}
