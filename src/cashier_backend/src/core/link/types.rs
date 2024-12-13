use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::{
    core::{AssetInfo, Link, LinkDetailUpdate, LinkType, Template},
    types::intent::Intent,
};

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct CreateLinkInput {
    pub link_type: LinkType,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct LinkDetailUpdateAssetInfoInput {
    pub address: String,
    pub chain: String,
    pub total_amount: u64,
    pub amount_per_claim: u64,
}

impl From<&LinkDetailUpdateAssetInfoInput> for AssetInfo {
    fn from(input: &LinkDetailUpdateAssetInfoInput) -> Self {
        AssetInfo {
            address: input.address.clone(),
            chain: input.chain.clone(),
            current_amount: input.total_amount, // Set current_amount to total_amount
            total_amount: input.total_amount,
            amount_per_claim: input.amount_per_claim,
            total_claim: 0, // Set total_claim to 0
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct LinkDetailUpdateInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub link_image_url: Option<String>,
    pub nft_image: Option<String>,
    pub asset_info: Option<Vec<LinkDetailUpdateAssetInfoInput>>,
    pub template: Option<String>,
}

impl LinkDetailUpdateInput {
    pub fn validate(&self) -> Result<(), String> {
        if let Some(template) = &self.template {
            match Template::from_string(template.as_str()) {
                Ok(_) => Ok(()),
                Err(e) => Err(e),
            }
        } else {
            Ok(())
        }
    }
}
#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct UpdateLinkParams {
    pub params: Option<LinkDetailUpdateInput>,
}

impl UpdateLinkParams {
    // This method is used to validate the input of UpdateLinkParams
    pub fn to_link_detail_update(&self) -> LinkDetailUpdate {
        match &self.params {
            Some(params) => {
                let template = match &params.template {
                    Some(template) => Some(Template::from_string(template.as_str()).unwrap()),
                    None => None,
                };
                let asset_info = match &params.asset_info {
                    Some(asset_info) => {
                        let mut asset_info_vec = Vec::new();
                        for asset_info_input in asset_info {
                            asset_info_vec.push(AssetInfo::from(asset_info_input));
                        }
                        Some(asset_info_vec)
                    }
                    None => None,
                };
                LinkDetailUpdate {
                    title: params.title.clone(),
                    description: params.description.clone(),
                    link_image_url: params.link_image_url.clone(),
                    nft_image: params.nft_image.clone(),
                    asset_info: asset_info,
                    template: template,
                    state: None,
                }
            }
            None => LinkDetailUpdate {
                title: None,
                description: None,
                link_image_url: None,
                nft_image: None,
                asset_info: None,
                template: None,
                state: None,
            },
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq)]
pub enum LinkStateMachineAction {
    Continue,
    Back,
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
            _ => Err("Invalid LinkStateMachineIntent. Valid value: Continue, Back".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum LinkStateMachineActionParams {
    Update(UpdateLinkParams),
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct UpdateLinkInput {
    pub id: String,
    pub action: String,
    pub params: Option<LinkStateMachineActionParams>,
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
                    UpdateLinkParams { params } => match params {
                        Some(params) => match params.validate() {
                            Ok(_) => Ok(()),
                            Err(e) => Err(e),
                        },
                        None => Ok(()),
                    },
                },
            },
            None => Ok(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct GetLinkResp {
    pub link: Link,
    pub intent_create: Option<Intent>,
}
