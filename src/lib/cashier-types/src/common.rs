use candid::CandidType;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq)]
pub enum Chain {
    IC,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Asset {
    pub address: String,
    pub chain: Chain,
}

impl Chain {
    pub fn to_str(&self) -> &str {
        match self {
            Chain::IC => "IC",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
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
