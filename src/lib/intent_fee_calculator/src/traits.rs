// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;

use crate::types::IntentFeeResult;

/// Strategy trait for fee calculation
pub trait IntentFeeStrategy {
    /// Calculate intent fees based on intent, link, and network fee
    /// # Arguments
    /// * `intent` - The created intent (has task + amount)
    /// * `link` - The link (has creator + max_use_count)
    /// * `network_fee` - Token network fee
    /// # Returns
    /// * `IntentFeeResult` - The calculated fee result
    fn calculate(&self, intent: &Intent, link: &Link, network_fee: Nat) -> IntentFeeResult;
}
