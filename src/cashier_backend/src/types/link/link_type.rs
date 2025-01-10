use candid::CandidType;
use serde::{Deserialize, Serialize};

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
