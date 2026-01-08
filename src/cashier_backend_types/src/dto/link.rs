// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};

use derive_more::Display;
use serde::{Deserialize, Serialize};

use crate::dto::action::ActionDto;
use crate::repository::action::v1::ActionType;
use crate::repository::asset_info::AssetInfo;
use crate::repository::common::Asset;
use crate::repository::link::v1::{Link, LinkState, LinkType};
use crate::repository::link_action::v1::LinkUserState;

// Structs and Enums

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkInput {
    pub title: String,
    pub link_use_action_max_count: u64,
    pub asset_info: Vec<LinkDetailUpdateAssetInfoInput>,
    pub link_type: LinkType,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDetailUpdateAssetInfoInput {
    pub asset: Asset,
    pub label: String,
    pub amount_per_link_use_action: Nat,
}

impl LinkDetailUpdateAssetInfoInput {
    pub fn to_model(&self) -> AssetInfo {
        AssetInfo {
            asset: self.asset.clone(),
            label: self.label.clone(),
            amount_per_link_use_action: self.amount_per_link_use_action.clone(),
            amount_available: Nat::from(0u64), // Initial value on creation
        }
    }

    pub fn is_changed(&self, asset_info: &AssetInfo) -> bool {
        self.to_model() != *asset_info
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Display)]
pub enum LinkStateMachineGoto {
    Continue,
    Back,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateLinkInput {
    pub id: String,
    pub goto: LinkStateMachineGoto,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetLinkOptions {
    pub action_type: ActionType,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDto {
    pub id: String,
    pub state: LinkState,
    pub title: String,
    pub link_type: LinkType,
    pub asset_info: Vec<AssetInfoDto>,
    pub creator: Principal,
    pub create_at: u64,
    pub link_use_action_counter: u64,
    pub link_use_action_max_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub struct AssetInfoDto {
    pub asset: Asset,
    pub label: String,
    pub amount_per_link_use_action: Nat,
    pub amount_available: Nat,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetLinkResp {
    pub link: LinkDto,
    pub action: Option<ActionDto>,
    pub link_user_state: LinkUserStateDto,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkUserStateDto {
    pub user_id: Principal,
    pub link_id: String,
    pub state: Option<LinkUserState>,
}

impl LinkUserStateDto {
    /// Create a DTO from the provided parts.
    pub fn from_parts(user_id: &Principal, link_id: &str, state: Option<LinkUserState>) -> Self {
        LinkUserStateDto {
            user_id: *user_id,
            link_id: link_id.to_string(),
            state,
        }
    }
}

impl From<LinkDetailUpdateAssetInfoInput> for AssetInfo {
    fn from(input: LinkDetailUpdateAssetInfoInput) -> Self {
        input.to_model()
    }
}

impl From<&AssetInfo> for AssetInfoDto {
    fn from(input: &AssetInfo) -> Self {
        AssetInfoDto {
            asset: input.asset.clone(),
            label: input.label.clone(),
            amount_per_link_use_action: input.amount_per_link_use_action.clone(),
            amount_available: input.amount_available.clone(),
        }
    }
}

impl From<Link> for LinkDto {
    fn from(link: Link) -> Self {
        LinkDto {
            id: link.id,
            state: link.state,
            title: link.title,
            link_type: link.link_type,
            asset_info: link.asset_info.iter().map(AssetInfoDto::from).collect(),
            creator: link.creator,
            create_at: link.create_at,
            link_use_action_counter: link.link_use_action_counter,
            link_use_action_max_count: link.link_use_action_max_count,
        }
    }
}

// Implementations

impl From<&LinkDetailUpdateAssetInfoInput> for AssetInfoDto {
    fn from(input: &LinkDetailUpdateAssetInfoInput) -> Self {
        AssetInfoDto {
            asset: input.asset.clone(),
            label: input.label.clone(),
            amount_per_link_use_action: input.amount_per_link_use_action.clone(),
            amount_available: Nat::from(0u64), // Initial value on creation
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkGetUserStateInput {
    pub link_id: String,
    pub action_type: ActionType,
    pub anonymous_wallet_address: Option<Principal>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkGetUserStateOutput {
    pub action: ActionDto,
    pub link_user_state: LinkUserState,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkUpdateUserStateInput {
    pub link_id: String,
    pub action_type: ActionType,
    pub anonymous_wallet_address: Option<Principal>,
    pub goto: UserStateMachineGoto,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Display)]
pub enum UserStateMachineGoto {
    Continue,
    Back,
}
