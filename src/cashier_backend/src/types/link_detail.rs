use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub enum LinkType {
    NftCreateAndAirdrop,
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
    pub title: String,
    pub description: String,
    pub image: String,
    pub link_type: LinkType,
    pub asset_info: AssetAirdropInfo,
    pub actions: Vec<Action>,
    pub template: Template,
    pub state: State,
    pub creator: String,
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
