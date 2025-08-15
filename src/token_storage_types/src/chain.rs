// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;
use std::str::FromStr;

#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
#[storable]
pub enum Chain {
    IC,
    // Can add more chains in the future
}

impl FromStr for Chain {
    type Err = String;
    fn from_str(chain: &str) -> Result<Self, Self::Err> {
        match chain {
            "IC" => Ok(Chain::IC),
            _ => Err(format!("Unsupported chain: {chain}")),
        }
    }
}

impl Chain {
    pub fn to_str(&self) -> String {
        match self {
            Chain::IC => "IC".to_string(),
        }
    }
}
