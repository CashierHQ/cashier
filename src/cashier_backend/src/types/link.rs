use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

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

    pub fn from_string(link_type: &str) -> LinkType {
        match link_type {
            "NftCreateAndAirdrop" => LinkType::NftCreateAndAirdrop,
            _ => LinkType::NftCreateAndAirdrop,
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
    pub amount: u64,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Copy)]
pub enum LinkState {
    // allow edit
    ChooseTemplate,
    AddAsset,
    CreateLink,
    // not allow edit
    Active,
    Inactive,
}

impl LinkState {
    pub fn to_string(&self) -> String {
        match self {
            LinkState::ChooseTemplate => "ChooseTemplate".to_string(),
            LinkState::AddAsset => "AddAsset".to_string(),
            LinkState::CreateLink => "CreateLink".to_string(),
            LinkState::Active => "Active".to_string(),
            LinkState::Inactive => "Inactive".to_string(),
        }
    }

    pub fn from_string(state: &str) -> LinkState {
        match state {
            "ChooseTemplate" => LinkState::ChooseTemplate,
            "AddAsset" => LinkState::AddAsset,
            "CreateLink" => LinkState::CreateLink,
            "Active" => LinkState::Active,
            "Inactive" => LinkState::Inactive,
            _ => LinkState::ChooseTemplate,
        }
    }

    pub fn is_valid(&self) -> bool {
        match self {
            LinkState::ChooseTemplate => true,
            LinkState::AddAsset => true,
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

    pub fn from_string(template: &str) -> Template {
        match template {
            "Left" => Template::Left,
            "Right" => Template::Right,
            "Central" => Template::Central,
            _ => Template::Central,
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
pub struct Link {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub image_url: Option<String>,
    pub link_type: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<String>,
    pub state: Option<String>,
    pub creator: Option<String>,
    pub create_at: Option<u64>,
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

pub struct LinkDetailUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
    pub state: Option<LinkState>,
}

impl Link {
    pub fn to_persistence(&self) -> crate::repositories::entities::link::Link {
        let pk = crate::repositories::entities::link::Link::build_pk(self.id.clone());
        crate::repositories::entities::link::Link {
            pk,
            title: self.title.clone(),
            description: self.description.clone(),
            image: self.image.clone(),
            image_url: self.image_url.clone(),
            link_type: self.link_type.clone(),
            asset_info: self.asset_info.clone(),
            template: self.template.clone(),
            state: self.state.clone(),
            creator: self.creator.clone(),
            create_at: self.create_at.clone(),
        }
    }

    pub fn from_persistence(link: crate::repositories::entities::link::Link) -> Self {
        let id = link.pk.split('#').last().unwrap().to_string();
        Self {
            id,
            title: link.title,
            description: link.description,
            image: link.image,
            image_url: link.image_url,
            link_type: link.link_type,
            asset_info: link.asset_info,
            template: link.template,
            state: link.state,
            creator: link.creator,
            create_at: link.create_at,
        }
    }

    pub fn create_new(id: String, creator: String, link_type: String, ts: u64) -> Self {
        Self {
            id,
            title: None,
            description: None,
            image: None,
            image_url: None,
            link_type: Some(link_type),
            asset_info: None,
            template: None,
            state: Some(LinkState::ChooseTemplate.to_string()),
            creator: Some(creator),
            create_at: Some(ts),
        }
    }

    pub fn update(&mut self, input: LinkDetailUpdate) -> () {
        let LinkDetailUpdate {
            title,
            description,
            image,
            asset_info,
            template,
            state,
        } = input;

        self.title = title.or(self.title.clone());
        self.description = description.or(self.description.clone());
        self.image = image.or(self.image.clone());
        self.asset_info = asset_info.or(self.asset_info.clone());
        self.template = template.map(|t| t.to_string()).or(self.template.clone());
        self.state = state.map(|s| s.to_string()).or(self.state.clone());
    }

    pub fn validate_fields_before_active(&self) -> Result<(), String> {
        let validators = [
            (&self.id.is_empty(), "id"),
            (&self.title.as_ref().map_or(true, |s| s.is_empty()), ","),
            (
                &self.description.as_ref().map_or(true, |s| s.is_empty()),
                "description",
            ),
            (&self.image.as_ref().map_or(true, |s| s.is_empty()), "image"),
            (&self.link_type.is_none(), "link_type"),
            (&self.asset_info.is_none(), "asset_info"),
            (&self.template.is_none(), "template"),
            (
                &self.creator.as_ref().map_or(true, |s| s.is_empty()),
                "creator",
            ),
        ];

        for (is_invalid, field_name) in validators {
            if *is_invalid {
                return Err(format!("{} is missing or empty", field_name));
            }
        }
        Ok(())
    }
}
