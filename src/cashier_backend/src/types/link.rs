use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum LinkType {
    NftCreateAndAirdrop,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Chain {
    IC,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct AssetInfo {
    pub address: String,
    pub chain: Chain,
    pub amount: u64,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Copy)]
pub enum State {
    // allow edit
    ChooseTemplate,
    AddAsset,
    CreateLink,
    // not allow edit
    Active,
    Inactive,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Template {
    Left,
    Right,
    Central,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Link {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub link_type: Option<LinkType>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<Template>,
    pub state: Option<State>,
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
    pub state: Option<State>,
}

impl Link {
    pub fn to_persistence(&self) -> crate::repositories::entities::link::Link {
        let pk = crate::repositories::entities::link::Link::build_pk(self.id.clone());
        crate::repositories::entities::link::Link {
            pk,
            title: self.title.clone(),
            description: self.description.clone(),
            image: self.image.clone(),
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
            link_type: link.link_type,
            asset_info: link.asset_info,
            template: link.template,
            state: link.state,
            creator: link.creator,
            create_at: link.create_at,
        }
    }

    pub fn create_new(id: String, creator: String, link_type: LinkType, ts: u64) -> Self {
        Self {
            id,
            title: None,
            description: None,
            image: None,
            link_type: Some(link_type),
            asset_info: None,
            template: None,
            state: Some(State::ChooseTemplate),
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
        self.template = template.or(self.template.clone());
        self.state = state.or(self.state.clone());
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

    pub fn activate(&mut self) -> Result<Link, String> {
        self.validate_fields_before_active()?;
        match self.state {
            Some(State::CreateLink) => {
                self.state = Some(State::Active);
                Ok(self.clone())
            }
            _ => Err("Invalid state transition activate".to_string()),
        }
    }

    pub fn deactivate(&mut self) -> Result<Link, String> {
        match self.state {
            Some(State::Active) => {
                self.state = Some(State::Inactive);
                Ok(self.clone())
            }
            _ => Err("Invalid state transition deactivate".to_string()),
        }
    }
}
