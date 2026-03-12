// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use std::fmt::Display;

pub type Chain = cashier_common::chain::Chain;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum Asset {
    IC { address: Principal },
}

impl Default for Asset {
    fn default() -> Self {
        Asset::IC {
            address: Principal::anonymous(),
        }
    }
}

impl Asset {
    /// Returns the chain of the asset
    pub fn chain(&self) -> Chain {
        match self {
            Asset::IC { .. } => Chain::IC,
        }
    }

    pub fn get_address(&self) -> Principal {
        match self {
            Asset::IC { address } => *address,
        }
    }
}

impl Display for Asset {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Asset::IC { address } => write!(f, "ic_asset_{}", address),
        }
    }
}
