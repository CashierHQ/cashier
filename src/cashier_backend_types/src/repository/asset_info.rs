// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use serde::{Deserialize, Serialize};

use crate::repository::common::Asset;
use cashier_shared::AssetInfo as AssetInfoShared;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AssetInfo {
    pub asset: Asset,
    pub label: String,
    pub amount_per_link_use_action: Nat,
}

impl AssetInfo {
    pub fn into_generated(&self) -> AssetInfoShared {
        AssetInfoShared {
            asset: self.asset.into_generated(),
            label: self.label.clone(),
            amount: self.amount_per_link_use_action.clone(),
        }
    }
}
