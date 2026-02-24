// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use serde::{Deserialize, Serialize};

use crate::repository::common::Asset;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AssetInfo {
    pub asset: Asset,
    pub label: String,
    pub amount_per_link_use_action: Nat,
}

impl AssetInfo {
    pub fn new(asset: Asset, label: String, amount_per_link_use_action: Nat) -> Self {
        Self {
            asset,
            label,
            amount_per_link_use_action,
        }
    }

    /// Returns the address of the asset
    /// # Returns
    /// * `Principal` - The principal address of the asset
    pub fn get_asset_address(&self) -> Principal {
        self.asset.get_address()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_should_get_asset_address() {
        // Arrange
        let ledger_id = random_principal_id();
        let asset = Asset::IC { address: ledger_id };
        let asset_info = AssetInfo::new(asset.clone(), "Test Asset".to_string(), Nat::from(100u64));

        // Act
        let address = asset_info.get_asset_address();

        // Assert
        assert_eq!(address, ledger_id);
    }
}
