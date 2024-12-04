use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::{
    core::{AssetInfo, Link, LinkDetailUpdate, LinkType, Template},
    types::action::Action,
};

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
    pub template: Option<String>,
}

impl LinkDetailUpdateInput {
    pub fn validate(&self) -> Result<(), String> {
        if let Some(template) = &self.template {
            match Template::from_string_result(template.as_str()) {
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
    pub fn to_link_detail_update(&self) -> LinkDetailUpdate {
        match &self.params {
            Some(params) => LinkDetailUpdate {
                title: params.title.clone(),
                description: params.description.clone(),
                image: params.image.clone(),
                asset_info: params.asset_info.clone(),
                template: Some(Template::from_string(
                    params.template.clone().unwrap().as_str(),
                )),
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

impl LinkStateMachineAction {
    pub fn to_string(&self) -> String {
        match self {
            LinkStateMachineAction::Continue => "Continue".to_string(),
            LinkStateMachineAction::Back => "Back".to_string(),
        }
    }

    pub fn from_string(action: &str) -> LinkStateMachineAction {
        match action {
            "Continue" => LinkStateMachineAction::Continue,
            "Back" => LinkStateMachineAction::Back,
            _ => LinkStateMachineAction::Continue,
        }
    }

    pub fn from_string_result(action: &str) -> Result<LinkStateMachineAction, String> {
        match action {
            "Continue" => Ok(LinkStateMachineAction::Continue),
            "Back" => Ok(LinkStateMachineAction::Back),
            _ => Err("Invalid LinkStateMachineAction. Valid value: Continue, Back".to_string()),
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
        match LinkStateMachineAction::from_string_result(self.action.as_str()) {
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
    pub action_create: Option<Action>,
}
