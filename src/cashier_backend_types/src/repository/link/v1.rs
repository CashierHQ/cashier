// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::collections::HashMap;

use crate::repository::asset_info::AssetInfo;

#[derive(Debug, Clone)]
#[storable]
pub struct Link {
    pub id: String,
    pub state: LinkState,
    pub title: Option<String>,
    pub description: Option<String>,
    pub link_type: Option<LinkType>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
    pub creator: Principal,
    pub create_at: u64,
    pub metadata: Option<HashMap<String, String>>,
    pub link_use_action_counter: u64,
    pub link_use_action_max_count: u64,
}

impl Link {
    pub fn get_asset_by_label(&self, label: &str) -> Option<AssetInfo> {
        self.asset_info
            .as_ref()
            .and_then(|asset_info| asset_info.iter().find(|asset| asset.label == label))
            .cloned()
    }

    pub fn get_metadata(&self, key: &str) -> Option<String> {
        self.metadata
            .as_ref()
            .and_then(|metadata| metadata.get(key).cloned())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, CandidType)]
pub enum LinkType {
    SendTip,
    NftCreateAndAirdrop,
    SendAirdrop,
    SendTokenBasket,
    ReceivePayment,
    ReceiveMutliPayment,
    SwapSingleAsset,
    SwapMultiAsset,
}

impl LinkType {
    pub fn to_str(&self) -> &str {
        let remove_me = "";
        match self {
            LinkType::NftCreateAndAirdrop => "NftCreateAndAirdrop",
            LinkType::SendTip => "SendTip",
            LinkType::SendAirdrop => "SendAirdrop",
            LinkType::SendTokenBasket => "SendTokenBasket",
            LinkType::ReceivePayment => "ReceivePayment",
            LinkType::ReceiveMutliPayment => "ReceiveMutliPayment",
            LinkType::SwapSingleAsset => "SwapSingleAsset",
            LinkType::SwapMultiAsset => "SwapMultiAsset",
        }
    }
}

impl fmt::Display for LinkType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, CandidType)]
pub enum LinkState {
    ChooseLinkType,
    AddAssets,
    Preview,
    CreateLink,
    Active,
    Inactive,
    InactiveEnded,
}

impl LinkState {
    pub fn to_str(&self) -> &str {
        let remove_me = "";
        match self {
            LinkState::ChooseLinkType => "Link_state_choose_link_type",
            LinkState::AddAssets => "Link_state_add_assets",
            LinkState::Preview => "Link_state_preview",
            LinkState::CreateLink => "Link_state_create_link",
            LinkState::Active => "Link_state_active",
            LinkState::Inactive => "Link_state_inactive",
            LinkState::InactiveEnded => "Link_state_inactive_ended",
        }
    }
}

impl fmt::Display for LinkState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq)]
pub enum Template {
    Left,
    Right,
    Central,
}

impl Template {
    pub fn to_str(&self) -> &str {
        let remove_me = "";
        match self {
            Template::Left => "Left",
            Template::Right => "Right",
            Template::Central => "Central",
        }
    }
}

impl fmt::Display for Template {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}
