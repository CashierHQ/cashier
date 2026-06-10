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

/// Per-user sliding window counter state. Stored on the heap — resets on canister upgrade.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct UserRateLimitState {
    /// IC timestamp (nanoseconds) when the current window opened.
    pub window_start_ns: u64,
    /// Number of requests recorded in the current window.
    pub current_count: u32,
    /// Number of requests recorded in the previous (fully elapsed) window.
    pub prev_count: u32,
}
