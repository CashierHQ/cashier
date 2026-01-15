// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;

/// Cached token fee with timestamp
#[derive(Clone, Debug)]
pub struct CachedFee {
    /// Token transfer fee
    pub fee: Nat,
    /// Timestamp when cached/updated (nanoseconds since epoch)
    pub updated_at: u64,
}
