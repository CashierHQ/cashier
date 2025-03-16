use std::{collections::HashMap, str::FromStr};

use candid::{CandidType, Principal};
use cashier_types::{Chain, IntentType, LinkType, Template};
use serde::{Deserialize, Serialize};

use crate::core::action::types::ActionDto;

// Structs and Enums

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkInput {
    pub link_type: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDetailUpdateAssetInfoInput {
    pub address: String,
    pub chain: String,
    pub total_amount: u64,
    pub amount_per_claim: u64,
    pub label: String,
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

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq)]
pub enum LinkStateMachineAction {
    Continue,
    Back,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum LinkStateMachineActionParams {
    Update(LinkDetailUpdateInput),
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateLinkInput {
    pub id: String,
    pub action: String,
    pub params: Option<LinkStateMachineActionParams>,
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
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub struct AssetInfoDto {
    pub address: String,
    pub chain: String,
    pub total_amount: u64,
    pub amount_per_claim: u64,
    pub total_claim: u64,
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

impl From<cashier_types::Intent> for IntentDto {
    fn from(intent: cashier_types::Intent) -> Self {
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

impl From<LinkDetailUpdateAssetInfoInput> for cashier_types::AssetInfo {
    fn from(input: LinkDetailUpdateAssetInfoInput) -> Self {
        let chain = match Chain::from_str(input.chain.as_str()) {
            Ok(chain) => chain,
            Err(_) => Chain::IC,
        };

        cashier_types::AssetInfo {
            address: input.address,
            chain,
            total_amount: input.total_amount,
            amount_per_claim: input.amount_per_claim,
            label: input.label,
            // start with 0
            total_claim: 0,
        }
    }
}

impl From<&cashier_types::AssetInfo> for AssetInfoDto {
    fn from(input: &cashier_types::AssetInfo) -> Self {
        let chain = input.chain.to_string();

        AssetInfoDto {
            address: input.address.clone(),
            chain,
            total_amount: input.total_amount,
            amount_per_claim: input.amount_per_claim,
            total_claim: input.total_claim,
        }
    }
}

impl From<cashier_types::Link> for LinkDto {
    fn from(link: cashier_types::Link) -> Self {
        let asset_info = match link.asset_info {
            Some(asset_info) => {
                let asset_info_vec = asset_info
                    .iter()
                    .map(|asset| AssetInfoDto::from(asset))
                    .collect();

                Some(asset_info_vec)
            }
            None => None,
        };

        let link_type_str = if let Some(link_type) = link.link_type {
            Some(link_type.to_string())
        } else {
            None
        };

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
        }
    }
}

// Implementations

impl LinkDetailUpdateAssetInfoInput {
    pub fn validate(&self) -> Result<(), String> {
        if self.total_amount < self.amount_per_claim {
            return Err("Total amount should be greater than amount per claim".to_string());
        }

        match Principal::from_text(self.address.as_str()) {
            Ok(_) => {}
            Err(_) => return Err("Invalid address".to_string()),
        }

        Ok(())
    }
}

impl From<&LinkDetailUpdateAssetInfoInput> for AssetInfoDto {
    fn from(input: &LinkDetailUpdateAssetInfoInput) -> Self {
        let chain = input.chain.to_string();

        AssetInfoDto {
            address: input.address.clone(),
            chain,
            total_amount: input.total_amount,
            amount_per_claim: input.amount_per_claim,
            total_claim: 0,
        }
    }
}

impl LinkDetailUpdateInput {
    pub fn validate(&self) -> Result<(), String> {
        if let Some(template) = &self.template {
            Template::from_str(template).map_err(|_| format!("Invalid template: "))?;
        }

        if let Some(link_type) = &self.link_type {
            LinkType::from_str(link_type).map_err(|_| format!("Invalid link type "))?;
        }

        if let Some(asset_info) = &self.asset_info {
            for asset_info_input in asset_info {
                asset_info_input.validate()?;
            }
        }

        Ok(())
    }
}

impl LinkStateMachineAction {
    pub fn to_string(&self) -> String {
        match self {
            LinkStateMachineAction::Continue => "Continue".to_string(),
            LinkStateMachineAction::Back => "Back".to_string(),
        }
    }

    pub fn from_string(intent: &str) -> Result<LinkStateMachineAction, String> {
        match intent {
            "Continue" => Ok(LinkStateMachineAction::Continue),
            "Back" => Ok(LinkStateMachineAction::Back),
            _ => Err("Invalid LinkStateMachineAction. Valid value: Continue, Back".to_string()),
        }
    }
}

impl UpdateLinkInput {
    pub fn validate(&self) -> Result<(), String> {
        match LinkStateMachineAction::from_string(self.action.as_str()) {
            Ok(_) => {}
            Err(e) => return Err(e),
        }

        match &self.params {
            Some(params) => match params {
                LinkStateMachineActionParams::Update(params) => match params {
                    LinkDetailUpdateInput {
                        title,
                        description,
                        link_image_url: _,
                        nft_image: _,
                        asset_info,
                        template,
                        link_type,
                    } => {
                        if let Some(template) = template {
                            Template::from_str(template)
                                .map_err(|_| format!("Invalid template: "))?;
                        }

                        if let Some(link_type) = link_type {
                            LinkType::from_str(link_type)
                                .map_err(|_| format!("Invalid link type "))?;
                        }

                        if let Some(asset_info) = asset_info {
                            for asset_info_input in asset_info {
                                asset_info_input.validate()?;
                            }
                        }

                        if let Some(title) = title {
                            if title.is_empty() {
                                return Err("Title should not be empty".to_string());
                            }
                        }

                        if let Some(description) = description {
                            if description.is_empty() {
                                return Err("Description should not be empty".to_string());
                            }
                        }

                        Ok(())
                    }
                },
            },
            None => Ok(()),
        }
    }
}
