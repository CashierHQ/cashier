use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Serialize, Deserialize, Debug, CandidType)]
#[repr(u8)]
pub enum LinkType {
    NftCreateAndAirdrop = 1,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum Chain {
    IC,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct Action {
    pub canister_id: String,
    pub label: String,
    pub method: String,
    pub arg: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct AssetAirdropInfo {
    pub address: String,
    pub chain: Chain,
    pub amount: u32,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum State {
    New,
    PendingDetail,
    PendingPreview,
    Active,
    Inactive,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum Template {
    Left,
    Right,
    Central,
}

#[derive(Serialize, Deserialize, Debug, CandidType)]
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
}
