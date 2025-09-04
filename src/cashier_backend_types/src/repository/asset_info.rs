// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use serde::{Deserialize, Serialize};

use crate::repository::common::Asset;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AssetInfo {
    pub asset: Asset,
    pub label: String,
    pub amount_per_link_use_action: u64,
}
