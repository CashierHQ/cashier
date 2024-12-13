use candid::CandidType;
use nft_create_and_airdrop_link::NftCreateAndAirdropLink;
use serde::{Deserialize, Serialize};
use tip_link::TipLink;

pub mod nft_create_and_airdrop_link;
pub mod tip_link;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum LinkType {
    NftCreateAndAirdrop,
    TipLink,
}

impl LinkType {
    pub fn to_string(&self) -> String {
        match self {
            LinkType::NftCreateAndAirdrop => "NftCreateAndAirdrop".to_string(),
            LinkType::TipLink => "TipLink".to_string(),
        }
    }

    pub fn from_string(link_type: &str) -> Result<LinkType, String> {
        match link_type {
            "NftCreateAndAirdrop" => Ok(LinkType::NftCreateAndAirdrop),
            "TipLink" => Ok(LinkType::TipLink),
            _ => Err("Invalid link type".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Chain {
    IC,
}

impl Chain {
    pub fn to_string(&self) -> String {
        match self {
            Chain::IC => "IC".to_string(),
        }
    }

    pub fn from_string(chain: &str) -> Chain {
        match chain {
            "IC" => Chain::IC,
            _ => Chain::IC,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct AssetInfo {
    pub address: String,
    pub chain: String,
    pub current_amount: u64,
    pub total_amount: u64,
    pub amount_per_claim: u64,
    pub total_claim: u64,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Copy)]
pub enum LinkState {
    // allow edit
    ChooseLinkType,
    AddAssets,
    CreateLink,
    // not allow edit
    Active,
    Inactive,
}

impl LinkState {
    pub fn to_string(&self) -> String {
        match self {
            LinkState::ChooseLinkType => "Link_state_choose_link_type".to_string(),
            LinkState::AddAssets => "Link_state_add_assets".to_string(),
            LinkState::CreateLink => "Link_state_create_link".to_string(),
            LinkState::Active => "Link_state_active".to_string(),
            LinkState::Inactive => "Link_state_inactive".to_string(),
        }
    }

    pub fn from_string(state: &str) -> Result<LinkState, String> {
        match state {
            "Link_state_choose_link_type" => Ok(LinkState::ChooseLinkType),
            "Link_state_add_assets" => Ok(LinkState::AddAssets),
            "Link_state_create_link" => Ok(LinkState::CreateLink),
            "Link_state_active" => Ok(LinkState::Active),
            "Link_state_inactive" => Ok(LinkState::Inactive),
            _ => Err("Invalid link state".to_string()),
        }
    }

    pub fn is_valid(&self) -> bool {
        match self {
            LinkState::ChooseLinkType => true,
            LinkState::AddAssets => true,
            LinkState::CreateLink => true,
            LinkState::Active => true,
            LinkState::Inactive => true,
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
    pub fn to_string(&self) -> String {
        match self {
            Template::Left => "Left".to_string(),
            Template::Right => "Right".to_string(),
            Template::Central => "Central".to_string(),
        }
    }

    pub fn from_string(template: &str) -> Result<Template, String> {
        match template {
            "Left" => Ok(Template::Left),
            "Right" => Ok(Template::Right),
            "Central" => Ok(Template::Central),
            _ => Err("Invalid template".to_string()),
        }
    }

    pub fn is_valid(&self) -> bool {
        match self {
            Template::Left => true,
            Template::Right => true,
            Template::Central => true,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Link {
    NftCreateAndAirdropLink(NftCreateAndAirdropLink),
    TipLink(TipLink),
}

impl From<NftCreateAndAirdropLink> for Link {
    fn from(link: NftCreateAndAirdropLink) -> Self {
        Link::NftCreateAndAirdropLink(link)
    }
}

pub struct LinkDetailUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub nft_image: Option<String>,
    pub link_image_url: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
    pub state: Option<LinkState>,
}

impl Link {
    pub fn get(&self, prop_name: &str) -> Option<String> {
        match self {
            Link::NftCreateAndAirdropLink(link) => link.get(prop_name),
            Link::TipLink(link) => link.get(prop_name),
            // Handle other variants if needed
        }
    }

    pub fn set<T: Into<Option<String>>>(&mut self, prop_name: &str, value: T) {
        match self {
            Link::NftCreateAndAirdropLink(link) => link.set(prop_name, value),
            Link::TipLink(link) => link.set(prop_name, value),
            // Handle other variants if needed
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::link::Link {
        match self {
            Link::NftCreateAndAirdropLink(link) => link.to_persistence(),
            Link::TipLink(link) => link.to_persistence(),
            // Handle other variants if needed
        }
    }

    pub fn from_persistence(link: crate::repositories::entities::link::Link) -> Self {
        match link.link_type.as_deref() {
            Some("NftCreateAndAirdrop") => {
                Link::NftCreateAndAirdropLink(NftCreateAndAirdropLink::from_persistence(link))
            }
            Some("TipLink") => Link::TipLink(TipLink::from_persistence(link)),
            _ => ic_cdk::trap("Invalid link type"),
        }
    }

    pub fn create_new(id: String, creator: String, link_type: String, ts: u64) -> Self {
        match LinkType::from_string(link_type.as_str()) {
            Ok(LinkType::NftCreateAndAirdrop) => Link::NftCreateAndAirdropLink(
                NftCreateAndAirdropLink::create_new(id, creator, link_type, ts),
            ),
            Ok(LinkType::TipLink) => Link::TipLink(TipLink::create_new(id, creator, link_type, ts)),
            Err(_) => ic_cdk::trap("Invalid link type"),
        }
    }

    pub fn update(&mut self, input: LinkDetailUpdate) {
        match self {
            Link::NftCreateAndAirdropLink(link) => link.update(input),
            Link::TipLink(link) => link.update(input),
            // Handle other variants if needed
        }
    }

    pub fn is_valid_fields_before_active(&self) -> Result<bool, String> {
        match self {
            Link::NftCreateAndAirdropLink(link) => link.is_valid_fields_before_active(),
            Link::TipLink(link) => link.is_valid_fields_before_active(),
            // Handle other variants if needed
        }
    }
}
