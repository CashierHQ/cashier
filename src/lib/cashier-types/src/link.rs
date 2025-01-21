use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::asset_info::AssetInfo;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Link {
    pub id: String,
    pub state: LinkState,
    pub title: Option<String>,
    pub description: Option<String>,
    pub link_type: Option<LinkType>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
    pub creator: Option<String>,
    pub create_at: Option<u64>,
    pub link_image_url: Option<String>,
    pub nft_image: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum LinkType {
    NftCreateAndAirdrop,
    TipLink,
}

impl LinkType {
    pub fn from_string(s: &str) -> Result<Self, String> {
        match s {
            "NftCreateAndAirdrop" => Ok(LinkType::NftCreateAndAirdrop),
            "TipLink" => Ok(LinkType::TipLink),
            _ => Err("Invalid link type".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum LinkState {
    ChooseLinkType,
    AddAssets,
    CreateLink,
    Active,
    Inactive,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Template {
    Left,
    Right,
    Central,
}

impl Template {
    pub fn from_string(s: &str) -> Result<Self, String> {
        match s {
            "Left" => Ok(Template::Left),
            "Right" => Ok(Template::Right),
            "Central" => Ok(Template::Central),
            _ => Err("Invalid template".to_string()),
        }
    }
}
