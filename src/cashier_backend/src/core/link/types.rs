use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::core::{AssetInfo, LinkDetailUpdate, LinkType, State, Template};

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
    pub state: Option<State>,
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
                state: self.state.clone(),
            },
            None => LinkDetailUpdate {
                title: None,
                description: None,
                image: None,
                asset_info: None,
                template: None,
                state: self.state.clone(),
            },
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum LinkStateMachineAction {
    Active,
    Inactive,
    Update,
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
