// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_shared::types::AssetInfo as AssetInfoShared;
use serde::{Deserialize, Serialize};

use crate::repository::{asset::v3::AssetV3, intent::v3::IntentV3};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AssetInfoV3 {
    pub asset: AssetV3,
    pub label: String,
    pub amount: Nat,
}

impl From<AssetInfoShared> for AssetInfoV3 {
    fn from(asset_info: AssetInfoShared) -> Self {
        AssetInfoV3 {
            asset: AssetV3::from(asset_info.asset),
            label: asset_info.label,
            amount: asset_info.amount,
        }
    }
}

impl AssetInfoV3 {
    pub fn to_shared(&self) -> AssetInfoShared {
        AssetInfoShared {
            asset: self.asset.to_shared(),
            label: self.label.clone(),
            amount: self.amount.clone(),
        }
    }

    /// Returns the address of the asset
    /// # Returns
    /// * `Principal` - The principal address of the asset
    pub fn get_asset_address(&self) -> Principal {
        self.asset.address
    }
}

impl From<IntentV3> for AssetInfoV3 {
    fn from(intents: IntentV3) -> Self {
        AssetInfoV3 {
            asset: intents.asset,
            label: intents.label,
            amount: intents.amount,
        }
    }
}
