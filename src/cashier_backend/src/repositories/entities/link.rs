use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

use crate::types::link::AssetInfo;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Link {
    pub pk: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub nft_image: Option<String>,
    pub link_image_url: Option<String>,
    pub link_type: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<String>,
    pub state: Option<String>,
    pub creator: Option<String>,
    pub create_at: Option<u64>,
}

pub const PK_PREFIX: &str = "link";

impl Link {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PREFIX, id)
    }

    pub fn split_pk(pk: &str) -> String {
        pk.split('#').collect::<Vec<&str>>()[1].to_string()
    }
}

impl Storable for Link {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
