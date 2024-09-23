use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::core::{Action, AssetAirdropInfo, LinkDetailUpdate, LinkType, State, Template};

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct CreateLinkInput {
    pub link_type: LinkType,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct UpdateLinkInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub asset_info: Option<AssetAirdropInfo>,
    pub actions: Option<Vec<Action>>,
    pub template: Option<Template>,
    pub state: Option<State>,
}

impl UpdateLinkInput {
    pub fn to_link_detail_update(&self) -> LinkDetailUpdate {
        LinkDetailUpdate {
            title: self.title.clone(),
            description: self.description.clone(),
            image: self.image.clone(),
            asset_info: self.asset_info.clone(),
            actions: self.actions.clone(),
            template: self.template.clone(),
            state: self.state.clone(),
        }
    }
}
