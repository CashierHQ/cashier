// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use derive_more::Display;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::repository::asset_info::AssetInfo;

#[derive(Debug, Clone)]
#[storable]
pub struct Link {
    pub id: String,
    pub state: LinkState,
    #[deprecated(note = "This should be mandatory")]
    pub title: Option<String>,
    #[deprecated(note = "This should be remove")]
    pub description: Option<String>,
     #[deprecated(note = "This should be mandatory")]
    pub link_type: Option<LinkType>,
    pub asset_info: Vec<AssetInfo>,
    #[deprecated(note = "This should be remove")]
    pub template: Option<Template>,
    pub creator: Principal,
    pub create_at: u64,
    pub metadata: HashMap<String, String>,
    pub link_use_action_counter: u64,
    pub link_use_action_max_count: u64,
}

impl Link {
    pub fn get_asset_by_label(&self, label: &str) -> Option<AssetInfo> {
        self.asset_info
            .iter()
            .find(|asset| asset.label == label)
            .cloned()
    }

    pub fn get_metadata(&self, key: &str) -> Option<String> {
        self.metadata.get(key).cloned()
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, CandidType, Display)]
pub enum LinkType {
    SendTip,
    #[deprecated(note = "This should be remove")]
    NftCreateAndAirdrop,
    SendAirdrop,
    SendTokenBasket,
    ReceivePayment,
    #[deprecated(note = "This should be remove")]
    ReceiveMutliPayment,
    #[deprecated(note = "This should be remove")]
    SwapSingleAsset,
    #[deprecated(note = "This should be remove")]
    SwapMultiAsset,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, CandidType, Display)]
pub enum LinkState {
    #[deprecated(note = "Frontend state should be removed")]
    ChooseLinkType,
    #[deprecated(note = "Frontend state should be removed")]
    AddAssets,
    #[deprecated(note = "Frontend state should be removed")]
    Preview,
    CreateLink,
    Active,
    Inactive,
    InactiveEnded,
}

#[deprecated(note = "This should be remove")]
#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Display)]
pub enum Template {
    Left,
    Right,
    Central,
}
