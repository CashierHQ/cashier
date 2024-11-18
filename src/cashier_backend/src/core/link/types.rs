use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::core::{AssetInfo, ClientAction, LinkDetailUpdate, LinkType, State, Template};

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct CreateLinkInput {
    pub link_type: LinkType,
}
#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct UpdateLinkParams {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub actions: Option<Vec<ClientAction>>,
    pub template: Option<Template>,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum LinkStateMachineAction {
    Continue,
    Back,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct UpdateLinkInput {
    pub id: String,
    pub params: UpdateLinkParams,
    pub action: LinkStateMachineAction,
    pub state: Option<State>,
}

impl UpdateLinkInput {
    pub fn to_link_detail_update(&self) -> LinkDetailUpdate {
        LinkDetailUpdate {
            title: self.params.title.clone(),
            description: self.params.description.clone(),
            image: self.params.image.clone(),
            asset_info: self.params.asset_info.clone(),
            actions: self.params.actions.clone(),
            template: self.params.template.clone(),
            state: self.state.clone(),
        }
    }
}
