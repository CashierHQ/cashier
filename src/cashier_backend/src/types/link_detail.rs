use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

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

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum State {
    New,
    PendingDetail,
    PendingPreview,
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
    pub link_type: Option<LinkType>,
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
        if let Some(link_type) = input.link_type {
            self.link_type = Some(link_type);
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
}
