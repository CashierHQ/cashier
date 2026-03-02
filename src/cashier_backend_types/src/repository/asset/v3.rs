// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_shared::types::{Asset as AssetShared, TokenStandard as TokenStandardShared};
use serde::{Deserialize, Serialize};

pub type Chain = cashier_common::chain::Chain;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub struct AssetV3 {
    pub address: Principal,
    pub network_fee: Option<Nat>,
    pub token_standard: TokenStandardV3,
}

impl Default for AssetV3 {
    fn default() -> Self {
        AssetV3 {
            address: Principal::anonymous(),
            network_fee: None,
            token_standard: TokenStandardV3::default(),
        }
    }
}

impl From<AssetShared> for AssetV3 {
    fn from(asset: AssetShared) -> Self {
        let token_standard = asset.token_standard.unwrap_or(TokenStandardShared::ICRC2);

        AssetV3 {
            address: asset.address,
            network_fee: asset.network_fee,
            token_standard: TokenStandardV3::from(token_standard),
        }
    }
}

impl AssetV3 {
    pub fn to_shared(&self) -> AssetShared {
        AssetShared {
            address: self.address,
            network_fee: self.network_fee.clone(),
            token_standard: Some(self.token_standard.to_shared()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum TokenStandardV3 {
    ICRC1,
    ICRC2,
}

impl Default for TokenStandardV3 {
    fn default() -> Self {
        TokenStandardV3::ICRC2
    }
}

impl From<TokenStandardShared> for TokenStandardV3 {
    fn from(token_standard: TokenStandardShared) -> Self {
        match token_standard {
            TokenStandardShared::ICRC1 => TokenStandardV3::ICRC1,
            TokenStandardShared::ICRC2 => TokenStandardV3::ICRC2,
        }
    }
}

impl TokenStandardV3 {
    pub fn to_shared(&self) -> TokenStandardShared {
        match self {
            TokenStandardV3::ICRC1 => TokenStandardShared::ICRC1,
            TokenStandardV3::ICRC2 => TokenStandardShared::ICRC2,
        }
    }
}
