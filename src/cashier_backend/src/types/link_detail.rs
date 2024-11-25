use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

use crate::store::link_store;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
#[repr(u8)]
pub enum LinkType {
    NftCreateAndAirdrop = 1,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Chain {
    IC,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum ClientAction {
    CanisterAction(CanisterAction),
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CanisterAction {
    pub canister_id: String,
    pub label: String,
    pub method: String,
    pub arg: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct AssetInfo {
    pub address: String,
    pub chain: Chain,
    pub amount: u64,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq)]
pub enum State {
    // allow edit
    New,
    PendingDetail,
    PendingPreview,
    // not allow edit
    Active,
    Inactive,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Template {
    Left,
    Right,
    Central,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkDetail {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub link_type: Option<LinkType>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub actions: Option<Vec<ClientAction>>,
    pub template: Option<Template>,
    pub state: Option<State>,
    pub creator: Option<String>,
    pub create_at: Option<u64>,
}

impl Storable for LinkDetail {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

pub struct LinkDetailUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub actions: Option<Vec<ClientAction>>,
    pub template: Option<Template>,
    pub state: Option<State>,
}

impl LinkDetail {
    pub fn create_new(id: String, creator: String, link_type: LinkType) -> Self {
        Self {
            id,
            title: None,
            description: None,
            image: None,
            link_type: Some(link_type),
            asset_info: None,
            actions: None,
            template: None,
            state: Some(State::New),
            creator: Some(creator),
            create_at: Some(ic_cdk::api::time()),
        }
    }

    pub fn update(&mut self, input: LinkDetailUpdate) -> () {
        let LinkDetailUpdate {
            title,
            description,
            image,
            asset_info,
            actions,
            template,
            state,
        } = input;

        self.title = title.or(self.title.clone());
        self.description = description.or(self.description.clone());
        self.image = image.or(self.image.clone());
        self.asset_info = asset_info.or(self.asset_info.clone());
        self.actions = actions.or(self.actions.clone());
        self.template = template.or(self.template.clone());
        self.state = state.or(self.state.clone());
    }

    pub fn validate_fields_before_active(&self) -> Result<(), String> {
        let validators = [
            (&self.id.is_empty(), "id"),
            (&self.title.as_ref().map_or(true, |s| s.is_empty()), "title"),
            (
                &self.description.as_ref().map_or(true, |s| s.is_empty()),
                "description",
            ),
            (&self.image.as_ref().map_or(true, |s| s.is_empty()), "image"),
            (&self.link_type.is_none(), "link_type"),
            (&self.asset_info.is_none(), "asset_info"),
            (
                &self.actions.as_ref().map_or(true, |v| v.is_empty()),
                "actions",
            ),
            (&self.template.is_none(), "template"),
            (
                &self.creator.as_ref().map_or(true, |s| s.is_empty()),
                "creator",
            ),
        ];

        for (is_invalid, field_name) in validators {
            if *is_invalid {
                return Err(format!("{} is missing or empty", field_name));
            }
        }
        Ok(())
    }

    pub fn activate(&mut self) -> Result<(), String> {
        self.validate_fields_before_active()?;
        match self.state {
            Some(State::PendingPreview) => {
                self.state = Some(State::Active);
                Ok(())
            }
            _ => Err("Invalid state transition activate".to_string()),
        }
    }

    pub fn deactivate(&mut self) -> Result<(), String> {
        match self.state {
            Some(State::Active) => {
                self.state = Some(State::Inactive);
                Ok(())
            }
            _ => Err("Invalid state transition deactivate".to_string()),
        }
    }

    pub fn save(&self) -> LinkDetail {
        link_store::update(self.id.clone(), self.clone());
        self.clone()
    }
}
