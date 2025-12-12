// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
use serde::{Deserialize, Serialize};

use crate::repository::asset_info::AssetInfo;

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

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, CandidType, Display)]
pub enum LinkState {
    CreateLink,
    Active,
    Inactive,
    InactiveEnded,
}
