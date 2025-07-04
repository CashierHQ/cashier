// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::fmt;
use std::{collections::HashMap, str::FromStr};

use candid::{CandidType, Principal};
use cashier_types::{
    asset_info::AssetInfo,
    common::Chain,
    intent::v2::{Intent, IntentType},
    link::v1::{Link, LinkType, Template},
};
use serde::{Deserialize, Serialize};

use crate::core::action::types::ActionDto;

// Structs and Enums

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkInput {
    pub title: String,
    pub link_use_action_max_count: u64,
    pub asset_info: Vec<LinkDetailUpdateAssetInfoInput>,
    pub template: String,
    pub link_type: String,
    pub nft_image: Option<String>,
    pub link_image_url: Option<String>,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDetailUpdateAssetInfoInput {
    pub address: String,
    pub chain: String,
    pub label: String,
    pub amount_per_link_use_action: u64,
}

impl LinkDetailUpdateAssetInfoInput {
    pub fn to_model(&self) -> AssetInfo {
        let chain = match Chain::from_str(self.chain.as_str()) {
            Ok(chain) => chain,
            Err(_) => Chain::IC,
        };

        AssetInfo {
            address: self.address.clone(),
            chain,
            label: self.label.clone(),
            amount_per_link_use_action: self.amount_per_link_use_action,
        }
    }

    pub fn is_changed(&self, asset_info: &AssetInfo) -> bool {
        self.address == asset_info.address
            && self.chain == asset_info.chain.to_string()
            && self.label == asset_info.label
            && self.amount_per_link_use_action == asset_info.amount_per_link_use_action
    }

    pub fn validate(&self) -> Result<(), String> {
        match Principal::from_text(self.address.as_str()) {
            Ok(_) => Ok(()),
            Err(_) => Err("Invalid address".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDetailUpdateInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub link_image_url: Option<String>,
    pub nft_image: Option<String>,
    pub asset_info: Option<Vec<LinkDetailUpdateAssetInfoInput>>,
    pub template: Option<String>,
    pub link_type: Option<String>,
    pub link_use_action_max_count: Option<u64>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDetailUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub nft_image: Option<String>,
    pub link_image_url: Option<String>,
    pub asset_info: Option<Vec<AssetInfoDto>>,
    pub template: Option<String>,
    pub link_type: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]
pub enum LinkStateMachineGoto {
    Continue,
    Back,
}

impl fmt::Display for LinkStateMachineGoto {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            LinkStateMachineGoto::Continue => write!(f, "Continue"),
            LinkStateMachineGoto::Back => write!(f, "Back"),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateLinkInput {
    pub id: String,
    pub action: String, // goto
    pub params: Option<LinkDetailUpdateInput>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetLinkOptions {
    pub action_type: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDto {
    pub id: String,
    pub state: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub link_type: Option<String>,
    pub asset_info: Option<Vec<AssetInfoDto>>,
    pub template: Option<String>,
    pub creator: String,
    pub create_at: u64,
    pub metadata: Option<HashMap<String, String>>,
    pub link_use_action_counter: u64,
    pub link_use_action_max_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub struct AssetInfoDto {
    pub address: String,
    pub chain: String,
    pub label: String,
    pub amount_per_link_use_action: u64,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct IntentDto {
    pub id: String,
    pub state: String,
    pub created_at: u64,
    pub chain: String,
    pub task: String,
    pub r#type: IntentType,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetLinkResp {
    pub link: LinkDto,
    pub action: Option<ActionDto>,
}

impl From<Intent> for IntentDto {
    fn from(intent: Intent) -> Self {
        IntentDto {
            id: intent.id,
            state: intent.state.to_string(),
            created_at: intent.created_at,
            chain: intent.chain.to_string(),
            task: intent.task.to_string(),
            r#type: intent.r#type,
        }
    }
}

impl From<LinkDetailUpdateAssetInfoInput> for AssetInfo {
    fn from(input: LinkDetailUpdateAssetInfoInput) -> Self {
        let chain = match Chain::from_str(input.chain.as_str()) {
            Ok(chain) => chain,
            Err(_) => Chain::IC,
        };

        AssetInfo {
            address: input.address,
            chain,
            label: input.label,
            amount_per_link_use_action: input.amount_per_link_use_action,
        }
    }
}

impl From<&AssetInfo> for AssetInfoDto {
    fn from(input: &AssetInfo) -> Self {
        let chain = input.chain.to_string();

        AssetInfoDto {
            address: input.address.clone(),
            chain,
            label: input.label.clone(),
            amount_per_link_use_action: input.amount_per_link_use_action,
        }
    }
}

impl From<Link> for LinkDto {
    fn from(link: Link) -> Self {
        let asset_info = match link.asset_info {
            Some(asset_info) => {
                let asset_info_vec = asset_info.iter().map(AssetInfoDto::from).collect();

                Some(asset_info_vec)
            }
            None => None,
        };

        let link_type_str = link.link_type.map(|link_type| link_type.to_string());

        LinkDto {
            id: link.id,
            state: link.state.to_string(),
            title: link.title,
            description: link.description,
            link_type: link_type_str,
            asset_info,
            template: link.template.map(|t| t.to_string()),
            creator: link.creator,
            create_at: link.create_at,
            metadata: link.metadata,
            link_use_action_counter: link.link_use_action_counter,
            link_use_action_max_count: link.link_use_action_max_count,
        }
    }
}

// Implementations

impl From<&LinkDetailUpdateAssetInfoInput> for AssetInfoDto {
    fn from(input: &LinkDetailUpdateAssetInfoInput) -> Self {
        let chain = input.chain.to_string();

        AssetInfoDto {
            address: input.address.clone(),
            chain,
            label: input.label.clone(),
            amount_per_link_use_action: input.amount_per_link_use_action,
        }
    }
}

impl LinkDetailUpdateInput {
    pub fn validate(&self) -> Result<(), String> {
        if let Some(template) = &self.template {
            Template::from_str(template).map_err(|_| "Invalid template: ".to_string())?;
        }

        if let Some(link_type) = &self.link_type {
            LinkType::from_str(link_type).map_err(|_| "Invalid link type ".to_string())?;
        }

        if let Some(asset_info) = &self.asset_info {
            for asset_info_input in asset_info {
                asset_info_input.validate()?;
            }
        }

        Ok(())
    }
}

impl LinkStateMachineGoto {
    pub fn from_string(intent: &str) -> Result<LinkStateMachineGoto, String> {
        match intent {
            "Continue" => Ok(LinkStateMachineGoto::Continue),
            "Back" => Ok(LinkStateMachineGoto::Back),
            _ => Err("Invalid LinkStateMachineAction. Valid value: Continue, Back".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkGetUserStateInput {
    pub link_id: String,
    pub action_type: String,
    pub anonymous_wallet_address: Option<String>,
    // pub create_if_not_exist: bool,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkGetUserStateOutput {
    pub action: ActionDto,
    pub link_user_state: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkUpdateUserStateInput {
    pub link_id: String,
    pub action_type: String,
    pub anonymous_wallet_address: Option<String>,
    pub goto: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]
pub enum UserStateMachineGoto {
    Continue,
    Back,
}

impl fmt::Display for UserStateMachineGoto {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            UserStateMachineGoto::Continue => write!(f, "Continue"),
            UserStateMachineGoto::Back => write!(f, "Back"),
        }
    }
}

impl FromStr for UserStateMachineGoto {
    type Err = String;
    fn from_str(intent: &str) -> Result<Self, Self::Err> {
        match intent {
            "Continue" => Ok(UserStateMachineGoto::Continue),
            "Back" => Ok(UserStateMachineGoto::Back),
            _ => Err("Invalid UserStateMachineGoto. Valid value: Continue, Back".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateActionInput {
    pub link_id: String,
    pub action_id: String,
    pub external: bool,
}
