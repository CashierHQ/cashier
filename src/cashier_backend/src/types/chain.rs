use candid::CandidType;
use serde::{Deserialize, Serialize};

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
