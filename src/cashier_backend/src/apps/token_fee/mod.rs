// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Token fee caching service for optimized fee lookups.

mod fetcher;
mod service;

pub use fetcher::{IcrcTokenFetcher, TokenFetcher};
pub use service::TokenFeeService;

use std::cell::RefCell;

thread_local! {
    /// Configured TTL for token fee cache (nanoseconds)
    pub static TOKEN_FEE_TTL_NS: RefCell<u64> = const { RefCell::new(0) };
}

/// Initialize token fee service TTL
pub fn init_token_fee_ttl(ttl_ns: u64) {
    TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow_mut() = ttl_ns);
}

#[cfg(test)]
pub use fetcher::test_utils::MockTokenFetcher;
