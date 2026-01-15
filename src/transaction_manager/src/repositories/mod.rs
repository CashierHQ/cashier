// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod token_fee;

use crate::token_fee::CachedFee;
use std::cell::RefCell;
use std::collections::BTreeMap;

pub use token_fee::{TokenFeeRepository, TokenFeeRepositoryImpl};

#[cfg(test)]
pub use token_fee::test_utils::MockTokenFeeRepository;

/// Storage type for fee cache - in-memory BTreeMap
pub type FeeCacheStorage = BTreeMap<String, CachedFee>;

thread_local! {
    /// Fee cache storage
    pub static FEE_CACHE_STORE: RefCell<FeeCacheStorage> = const { RefCell::new(BTreeMap::new()) };
}
