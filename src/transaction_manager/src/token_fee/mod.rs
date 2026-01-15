// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod fetcher;
mod service;
mod types;

pub use fetcher::{IcrcTokenFetcher, TokenFetcher};
pub use service::TokenFeeService;
use std::cell::RefCell;
use std::collections::BTreeMap;
pub use types::CachedFee;

/// Storage type for fee cache - in-memory BTreeMap
pub type FeeCacheStorage = BTreeMap<String, CachedFee>;

thread_local! {
    /// Fee cache storage
    pub static FEE_CACHE_STORE: RefCell<FeeCacheStorage> = const { RefCell::new(BTreeMap::new()) };
    /// Configured TTL for token fee cache (nanoseconds)
    pub static TOKEN_FEE_TTL_NS: RefCell<u64> = const { RefCell::new(0) };
}

/// Initialize token fee service TTL
pub fn init_token_fee_ttl(ttl_ns: u64) {
    TOKEN_FEE_TTL_NS.with(|cell| {
        *cell.borrow_mut() = ttl_ns;
    });
}
