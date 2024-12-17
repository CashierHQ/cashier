use candid::CandidType;
use serde::{Deserialize, Serialize};

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
