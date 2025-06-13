// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, str::FromStr};

use crate::asset_info::AssetInfo;

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
    pub creator: String,
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

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
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

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for LinkType {
    type Err = ();

    fn from_str(input: &str) -> Result<LinkType, Self::Err> {
        match input {
            "NftCreateAndAirdrop" => Ok(LinkType::NftCreateAndAirdrop),
            "SendTip" => Ok(LinkType::SendTip),
            "SendAirdrop" => Ok(LinkType::SendAirdrop),
            "SendTokenBasket" => Ok(LinkType::SendTokenBasket),
            "ReceivePayment" => Ok(LinkType::ReceivePayment),
            "ReceiveMutliPayment" => Ok(LinkType::ReceiveMutliPayment),
            "SwapSingleAsset" => Ok(LinkType::SwapSingleAsset),
            "SwapMultiAsset" => Ok(LinkType::SwapMultiAsset),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
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

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for LinkState {
    type Err = ();

    fn from_str(input: &str) -> Result<LinkState, Self::Err> {
        match input {
            "Link_state_choose_link_type" => Ok(LinkState::ChooseLinkType),
            "Link_state_add_assets" => Ok(LinkState::AddAssets),
            "Link_state_preview" => Ok(LinkState::Preview),
            "Link_state_create_link" => Ok(LinkState::CreateLink),
            "Link_state_active" => Ok(LinkState::Active),
            "Link_state_inactive" => Ok(LinkState::Inactive),
            "Link_state_inactive_ended" => Ok(LinkState::InactiveEnded),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Template {
    Left,
    Right,
    Central,
}

impl Template {
    pub fn to_str(&self) -> &str {
        match self {
            Template::Left => "Left",
            Template::Right => "Right",
            Template::Central => "Central",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for Template {
    type Err = ();

    fn from_str(input: &str) -> Result<Template, Self::Err> {
        match input {
            "Left" => Ok(Template::Left),
            "Right" => Ok(Template::Right),
            "Central" => Ok(Template::Central),
            _ => Err(()),
        }
    }
}
