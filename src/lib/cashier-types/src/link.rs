use candid::CandidType;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

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
    pub fn to_str(&self) -> &str {
        match self {
            LinkType::NftCreateAndAirdrop => "NftCreateAndAirdrop",
            LinkType::TipLink => "TipLink",
        }
    }
}

impl FromStr for LinkType {
    type Err = ();

    fn from_str(input: &str) -> Result<LinkType, Self::Err> {
        match input {
            "NftCreateAndAirdrop" => Ok(LinkType::NftCreateAndAirdrop),
            "TipLink" => Ok(LinkType::TipLink),
            _ => Err(()),
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

impl LinkState {
    pub fn to_str(&self) -> &str {
        match self {
            LinkState::ChooseLinkType => "Link_state_choose_link_type",
            LinkState::AddAssets => "Link_state_add_assets",
            LinkState::CreateLink => "Link_state_create_link",
            LinkState::Active => "Link_state_active",
            LinkState::Inactive => "Link_state_inactive",
        }
    }
}

impl FromStr for LinkState {
    type Err = ();

    fn from_str(input: &str) -> Result<LinkState, Self::Err> {
        match input {
            "Link_state_choose_link_type" => Ok(LinkState::ChooseLinkType),
            "Link_state_add_assets" => Ok(LinkState::AddAssets),
            "Link_state_create_link" => Ok(LinkState::CreateLink),
            "Link_state_active" => Ok(LinkState::Active),
            "Link_state_inactive" => Ok(LinkState::Inactive),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Template {
    Left,
    Right,
    Central,
}

impl Template {
    pub fn to_str(&self) -> &str {
        match self {
            Template::Left => "Left",
            Template::Right => "Right",
            Template::Central => "Central",
        }
    }
}

impl FromStr for Template {
    type Err = ();

    fn from_str(input: &str) -> Result<Template, Self::Err> {
        match input {
            "Left" => Ok(Template::Left),
            "Right" => Ok(Template::Right),
            "Central" => Ok(Template::Central),
            _ => Err(()),
        }
    }
}
