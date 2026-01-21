// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;

use crate::types::IntentFeeResult;

/// Strategy trait for fee calculation
pub trait IntentFeeStrategy {
    /// Calculate intent fees based on link, intent, transactions, and network fee
    /// # Arguments
    /// * `link` - The link (has creator + max_use_count)
    /// * `intent` - The created intent (has task + amount)
    /// * `transactions` - The transactions for this intent (source of truth for ICRC1/ICRC2)
    /// * `network_fee` - Token network fee
    /// # Returns
    /// * `IntentFeeResult` - The calculated fee result
    fn calculate(
        &self,
        link: &Link,
        intent: &Intent,
        transactions: &[Transaction],
        network_fee: Nat,
    ) -> IntentFeeResult;
}
