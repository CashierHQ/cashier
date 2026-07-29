// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;

/// Configuration for the per-user sliding window rate limiter, shared across the
/// endpoints it protects (see `RateLimitScope`).
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

/// Identifies which endpoint a rate-limited request belongs to. Endpoints share one
/// `RateLimitConfig`, but each gets its own independent counter so exhausting one
/// endpoint's budget for a user never blocks that same user on another endpoint.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum RateLimitScope {
    /// `user_open_link_gate`
    GateOpen,
    /// `user_send_otp`
    SendOtp,
}

/// Composite key for the per-user, per-endpoint rate limit state map.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct RateLimitKey {
    pub user: Principal,
    pub scope: RateLimitScope,
}
