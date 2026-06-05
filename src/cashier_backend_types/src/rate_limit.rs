// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;

/// Configuration for the per-user sliding window rate limiter on the gate API.
#[derive(Debug, CandidType, Clone, PartialEq, Eq)]
#[storable]
pub struct RateLimitConfig {
    /// Whether rate limiting is active. Set to false to disable entirely.
    pub enabled: bool,
    /// Maximum number of requests allowed per window.
    pub max_requests: u32,
    /// Duration of the sliding window in seconds.
    pub window_secs: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_requests: 1,
            window_secs: 60,
        }
    }
}
