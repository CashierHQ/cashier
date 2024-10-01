use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

use crate::{store::link_store, utils::logger};

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
pub struct Action {
    pub canister_id: String,
    pub label: String,
    pub method: String,
    pub arg: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct AssetAirdropInfo {
    pub address: String,
    pub chain: Chain,
    pub amount: u32,
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
    pub asset_info: Option<AssetAirdropInfo>,
    pub actions: Option<Vec<Action>>,
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
    pub asset_info: Option<AssetAirdropInfo>,
    pub actions: Option<Vec<Action>>,
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
        if let Some(title) = input.title {
            self.title = Some(title);
        }
        if let Some(description) = input.description {
            self.description = Some(description);
        }
        if let Some(image) = input.image {
            self.image = Some(image);
        }
        if let Some(asset_info) = input.asset_info {
            self.asset_info = Some(asset_info);
        }
        if let Some(actions) = input.actions {
            self.actions = Some(actions);
        }
        if let Some(template) = input.template {
            self.template = Some(template);
        }
        if let Some(state) = input.state {
            self.state = Some(state);
        }
    }

    pub fn validate_fields_before_active(&self) -> Result<(), String> {
        if self.id.is_empty() {
            return Err("id is empty".to_string());
        }
        if self.title.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("title is missing or empty".to_string());
        }
        if self.description.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("description is missing or empty".to_string());
        }
        if self.image.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("image is missing or empty".to_string());
        }
        if self.link_type.is_none() {
            return Err("link_type is missing".to_string());
        }
        if self.asset_info.is_none() {
            return Err("asset_info is missing".to_string());
        }
        if self.actions.as_ref().map_or(true, |v| v.is_empty()) {
            return Err("actions are missing or empty".to_string());
        }
        if self.template.is_none() {
            return Err("template is missing".to_string());
        }
        if self.creator.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("creator is missing or empty".to_string());
        }
        Ok(())
    }

    pub fn back_to_new(&mut self) -> Result<(), String> {
        match self.state {
            Some(State::PendingDetail) => {
                self.state = Some(State::New);
                Ok(())
            }
            _ => Err("Invalid state transition back_to_new".to_string()),
        }
    }

    pub fn back_to_pending_detail(&mut self) -> Result<(), String> {
        match self.state {
            Some(State::PendingPreview) => {
                self.state = Some(State::PendingDetail);
                Ok(())
            }
            _ => Err("Invalid state transition back_to_pending_detail".to_string()),
        }
    }

    pub fn to_pending_detail(&mut self, input: LinkDetailUpdate) -> Result<(), String> {
        match self.state {
            Some(State::New) => {
                self.state = Some(State::PendingDetail);
                self.update(input);
                Ok(())
            }
            _ => Err("Invalid state transition to_pending_detail".to_string()),
        }
    }

    pub fn to_pending_preview(&mut self, input: LinkDetailUpdate) -> Result<(), String> {
        match self.state {
            Some(State::PendingDetail) => {
                self.state = Some(State::PendingPreview);
                self.update(input);
                Ok(())
            }
            _ => Err("Invalid state transition to_pending_preview".to_string()),
        }
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
