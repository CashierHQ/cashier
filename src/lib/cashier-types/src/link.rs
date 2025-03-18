use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, str::FromStr};

use crate::asset_info::AssetInfo;

#[derive(Debug, Clone)]
#[storable]
pub struct Link {
    pub id: String,
    pub state: LinkState,
    pub title: Option<String>,
    pub description: Option<String>,
    pub link_type: Option<LinkType>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
    pub creator: String,
    pub create_at: u64,
    pub metadata: Option<HashMap<String, String>>,
}

impl Link {
    pub fn get_asset_by_label(&self, label: &str) -> Option<AssetInfo> {
        self.asset_info
            .as_ref()
            .and_then(|asset_info| asset_info.iter().find(|asset| asset.label == label))
            .cloned()
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
pub enum LinkType {
    NftCreateAndAirdrop,
    TipLink,
}

#[derive(Debug, Clone)]
#[storable]
pub struct LinkAction {
    pub link_id: String,
    pub action_id: String,
    pub action_type: String,
    pub user_id: String,
    pub link_user_state: LinkUserState,
}

impl LinkType {
    pub fn to_str(&self) -> &str {
        match self {
            LinkType::NftCreateAndAirdrop => "NftCreateAndAirdrop",
            LinkType::TipLink => "TipLink",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
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

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
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

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
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

#[derive(Serialize, Deserialize, Debug, Clone)]
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

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum LinkUserState {
    ChooseWallet,
    CompletedLink,
}

impl LinkUserState {
    pub fn to_str(&self) -> &str {
        match self {
            LinkUserState::ChooseWallet => "User_state_choose_wallet",
            LinkUserState::CompletedLink => "User_state_completed_link",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}
