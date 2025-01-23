use candid::CandidType;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Chain {
    IC,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Asset {
    address: String,
    chain: Chain,
}

impl Chain {
    pub fn to_str(&self) -> &str {
        match self {
            Chain::IC => "IC",
        }
    }
}

impl FromStr for Chain {
    type Err = ();

    fn from_str(input: &str) -> Result<Chain, Self::Err> {
        match input {
            "IC" => Ok(Chain::IC),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Wallet {
    pub address: String,
    pub chain: Chain,
}
