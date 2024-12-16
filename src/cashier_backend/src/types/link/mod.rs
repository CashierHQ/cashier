use candid::CandidType;
use link_state::LinkState;
use serde::{Deserialize, Serialize};
use template::Template;

pub mod chain;
pub mod link_state;
pub mod link_type;
pub mod template;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Link {
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

impl Link {
    pub fn new(
        id: String,
        title: Option<String>,
        description: Option<String>,
        link_type: Option<String>,
        asset_info: Option<Vec<AssetInfo>>,
        template: Option<String>,
        state: Option<String>,
        creator: Option<String>,
        create_at: Option<u64>,
        link_image_url: Option<String>,
        nft_image: Option<String>,
    ) -> Self {
        Link {
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
        }
    }

    pub fn get(&self, prop_name: &str) -> Option<String> {
        match prop_name {
            "id" => Some(self.id.clone()),
            "title" => self.title.clone(),
            "description" => self.description.clone(),
            "link_type" => self.link_type.clone(),
            "template" => self.template.clone(),
            "state" => self.state.clone(),
            "creator" => self.creator.clone(),
            "link_image_url" => self.link_image_url.clone(),
            "nft_image" => self.nft_image.clone(),
            _ => None,
        }
    }

    pub fn set<T: Into<Option<String>>>(&mut self, prop_name: &str, value: T) {
        let value = value.into();
        match prop_name {
            "title" => self.title = value,
            "description" => self.description = value,
            "link_type" => self.link_type = value,
            "template" => self.template = value,
            "state" => self.state = value,
            "creator" => self.creator = value,
            "link_image_url" => self.link_image_url = value,
            "nft_image" => self.nft_image = value,
            _ => (),
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::link::Link {
        let pk = crate::repositories::entities::link::Link::build_pk(self.id.clone());
        crate::repositories::entities::link::Link {
            pk,
            title: self.title.clone(),
            description: self.description.clone(),
            nft_image: self.nft_image.clone(),
            link_image_url: self.link_image_url.clone(),
            link_type: self.link_type.clone(),
            asset_info: self.asset_info.clone(),
            template: self.template.clone(),
            state: self.state.clone(),
            creator: self.creator.clone(),
            create_at: self.create_at.clone(),
        }
    }

    pub fn from_persistence(link: crate::repositories::entities::link::Link) -> Self {
        let id = crate::repositories::entities::link::Link::split_pk(link.pk.as_str());
        Link {
            id,
            title: link.title,
            description: link.description,
            link_type: link.link_type,
            asset_info: link.asset_info,
            template: link.template,
            state: link.state,
            creator: link.creator,
            create_at: link.create_at,
            link_image_url: link.link_image_url,
            nft_image: link.nft_image,
        }
    }

    pub fn create_new(id: String, creator: String, link_type: String, ts: u64) -> Self {
        Link {
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
        }
    }

    pub fn update(&mut self, input: LinkDetailUpdate) {
        if let Some(title) = input.title {
            self.title = Some(title);
        }
        if let Some(description) = input.description {
            self.description = Some(description);
        }
        if let Some(nft_image) = input.nft_image {
            self.nft_image = Some(nft_image);
        }
        if let Some(link_image_url) = input.link_image_url {
            self.link_image_url = Some(link_image_url);
        }
        if let Some(asset_info) = input.asset_info {
            self.asset_info = Some(asset_info);
        }
        if let Some(template) = input.template {
            self.template = Some(template.to_string());
        }
        if let Some(state) = input.state {
            self.state = Some(state.to_string());
        }
    }

    pub fn is_valid_fields_before_active(&self) -> Result<bool, String> {
        if self.id.is_empty() {
            return Err("id is empty".to_string());
        }
        if self.title.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("title is missing or empty".to_string());
        }
        if self.description.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("description is missing or empty".to_string());
        }
        if self.link_image_url.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("link_image_url is missing or empty".to_string());
        }
        if self.link_type.is_none() {
            return Err("link_type is missing".to_string());
        }
        if self.asset_info.is_none() {
            return Err("asset_info is missing".to_string());
        }
        if self.template.is_none() {
            return Err("template is missing".to_string());
        }
        if self.creator.as_ref().map_or(true, |s| s.is_empty()) {
            return Err("creator is missing or empty".to_string());
        }
        Ok(true)
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

pub struct LinkDetailUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub nft_image: Option<String>,
    pub link_image_url: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
    pub state: Option<LinkState>,
}
