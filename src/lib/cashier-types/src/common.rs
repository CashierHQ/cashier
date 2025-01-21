use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Chain {
    IC,
}

impl Chain {
    pub fn from_str(s: &str) -> Self {
        match s {
            "IC" => Chain::IC,
            _ => Chain::IC,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Wallet {
    pub address: String,
    pub chain: Chain,
}
