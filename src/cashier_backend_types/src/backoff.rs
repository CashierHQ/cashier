// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;

/// Configuration for the exponential backoff throttler on the gate API.
///
/// After each consecutive failed gate attempt the user must wait
/// `base_wait_secs * 2^(failure_count - 1)` seconds before retrying.
/// A successful attempt resets the counter.
#[derive(Debug, CandidType, Clone, PartialEq, Eq)]
#[storable]
pub struct BackoffConfig {
    /// Whether exponential backoff is active. Set to false to disable entirely.
    pub enabled: bool,
    /// Base wait time in seconds (default: 180 = 3 min).
    /// Wait after failure N = base_wait_secs * 2^(N-1).
    pub base_wait_secs: u64,
}

impl Default for BackoffConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            base_wait_secs: 180,
        }
    }
}
