use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::core::{AssetInfo, LinkDetailUpdate, LinkType, Template};

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct CreateLinkInput {
    pub link_type: LinkType,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct LinkDetailUpdateInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
}
#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct UpdateLinkParams {
    pub params: Option<LinkDetailUpdateInput>,
}

impl UpdateLinkParams {
    pub fn to_link_detail_update(&self) -> LinkDetailUpdate {
        match &self.params {
            Some(params) => LinkDetailUpdate {
                title: params.title.clone(),
                description: params.description.clone(),
                image: params.image.clone(),
                asset_info: params.asset_info.clone(),
                template: params.template.clone(),
                state: None,
            },
            None => LinkDetailUpdate {
                title: None,
                description: None,
                image: None,
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

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum LinkStateMachineActionParams {
    Update(UpdateLinkParams),
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct UpdateLinkInput {
    pub id: String,
    pub action: LinkStateMachineAction,
    pub params: Option<LinkStateMachineActionParams>,
}
