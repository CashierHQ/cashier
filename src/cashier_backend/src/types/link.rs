use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::utils::logger;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum LinkType {
    NftCreateAndAirdrop,
}

impl LinkType {
    pub fn to_string(&self) -> String {
        match self {
            LinkType::NftCreateAndAirdrop => "NftCreateAndAirdrop".to_string(),
        }
    }

    pub fn from_string(link_type: &str) -> Result<LinkType, String> {
        match link_type {
            "NftCreateAndAirdrop" => Ok(LinkType::NftCreateAndAirdrop),
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
pub struct NftCreateAndAirdropLink {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub link_type: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<String>,
    pub state: Option<String>,
    pub creator: Option<String>,
    pub create_at: Option<u64>,
    pub link_image_url: Option<String>,
    pub nft_image: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Link {
    NftCreateAndAirdropLink(NftCreateAndAirdropLink),
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
            Link::NftCreateAndAirdropLink(link) => match prop_name {
                "id" => Some(link.id.clone()),
                "title" => link.title.clone(),
                "description" => link.description.clone(),
                "link_type" => link.link_type.clone(),
                "template" => link.template.clone(),
                "state" => link.state.clone(),
                "creator" => link.creator.clone(),
                "link_image_url" => link.link_image_url.clone(),
                "nft_image" => link.nft_image.clone(),
                _ => None,
            },
            // Handle other variants if needed
        }
    }

    pub fn set<T: Into<Option<String>>>(&mut self, prop_name: &str, value: T) {
        let value = value.into();
        logger::info(&format!("set prop_name: {}, value: {:?}", prop_name, value));
        match self {
            Link::NftCreateAndAirdropLink(link) => match prop_name {
                "title" => link.title = value,
                "description" => link.description = value,
                "link_type" => link.link_type = value,
                "template" => link.template = value,
                "state" => link.state = value,
                "creator" => link.creator = value,
                "link_image_url" => link.link_image_url = value,
                "nft_image" => link.nft_image = value,
                _ => (),
            },
            // Handle other variants if needed
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::link::Link {
        match self {
            Link::NftCreateAndAirdropLink(link) => {
                let pk = crate::repositories::entities::link::Link::build_pk(link.id.clone());
                crate::repositories::entities::link::Link {
                    pk,
                    title: link.title.clone(),
                    description: link.description.clone(),
                    nft_image: link.nft_image.clone(),
                    link_image_url: link.link_image_url.clone(),
                    link_type: link.link_type.clone(),
                    asset_info: link.asset_info.clone(),
                    template: link.template.clone(),
                    state: link.state.clone(),
                    creator: link.creator.clone(),
                    create_at: link.create_at.clone(),
                }
            }
        }
    }

    pub fn from_persistence(link: crate::repositories::entities::link::Link) -> Self {
        match link {
            crate::repositories::entities::link::Link {
                pk: pk,
                title,
                description,
                nft_image,
                link_image_url,
                link_type,
                asset_info,
                template,
                state,
                creator,
                create_at,
            } => {
                let id = crate::repositories::entities::link::Link::split_pk(pk.as_str());
                Link::NftCreateAndAirdropLink(NftCreateAndAirdropLink {
                    id,
                    title,
                    description,
                    link_type,
                    asset_info,
                    template,
                    state,
                    creator,
                    create_at,
                    link_image_url,
                    nft_image,
                })
            }
        }
    }

    pub fn create_new(id: String, creator: String, link_type: String, ts: u64) -> Self {
        match LinkType::from_string(link_type.as_str()) {
            Ok(LinkType::NftCreateAndAirdrop) => {
                Link::NftCreateAndAirdropLink(NftCreateAndAirdropLink {
                    id,
                    title: None,
                    description: None,
                    link_type: Some(link_type),
                    asset_info: None,
                    template: None,
                    state: Some(LinkState::ChooseLinkType.to_string()),
                    creator: Some(creator),
                    create_at: Some(ts),
                    link_image_url: None,
                    nft_image: None,
                })
            }
            Err(_) => ic_cdk::trap("Invalid link type"),
        }
    }

    pub fn update(&mut self, input: LinkDetailUpdate) {
        match self {
            Link::NftCreateAndAirdropLink(link) => {
                if let Some(title) = input.title {
                    link.title = Some(title);
                }
                if let Some(description) = input.description {
                    link.description = Some(description);
                }
                if let Some(nft_image) = input.nft_image {
                    link.nft_image = Some(nft_image);
                }
                if let Some(link_image_url) = input.link_image_url {
                    link.link_image_url = Some(link_image_url);
                }
                if let Some(asset_info) = input.asset_info {
                    link.asset_info = Some(asset_info);
                }
                if let Some(template) = input.template {
                    link.template = Some(template.to_string());
                }
                if let Some(state) = input.state {
                    link.state = Some(state.to_string());
                }
            }
        }
    }
}
