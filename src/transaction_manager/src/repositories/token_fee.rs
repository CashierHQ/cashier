// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Token fee cache repository abstraction.
//! Provides trait-based dependency injection for volatile in-memory fee cache.

use super::FEE_CACHE_STORE;
use crate::token_fee::CachedFee;

/// Repository trait for token fee cache operations.
/// Abstracts storage access for testability via dependency injection.
pub trait TokenFeeRepository {
    /// Get cached fee by token key
    fn get(&self, key: &str) -> Option<CachedFee>;

    /// Insert or update cached fee
    fn insert(&self, key: &str, fee: CachedFee);

    /// Remove cached fee for specific token
    fn remove(&self, key: &str);

    /// Clear all cached fees
    fn clear(&self);
}

/// Thread-local implementation wrapping FEE_CACHE_STORE.
/// Used in production for actual cache storage.
#[derive(Clone, Default)]
pub struct TokenFeeRepositoryImpl;

impl TokenFeeRepository for TokenFeeRepositoryImpl {
    fn get(&self, key: &str) -> Option<CachedFee> {
        FEE_CACHE_STORE.with(|cell| cell.borrow().get(key).cloned())
    }

    fn insert(&self, key: &str, fee: CachedFee) {
        FEE_CACHE_STORE.with(|cell| {
            cell.borrow_mut().insert(key.to_string(), fee);
        });
    }

    fn remove(&self, key: &str) {
        FEE_CACHE_STORE.with(|cell| {
            cell.borrow_mut().remove(key);
        });
    }

    fn clear(&self) {
        FEE_CACHE_STORE.with(|cell| {
            cell.borrow_mut().clear();
        });
    }
}

#[cfg(test)]
pub mod test_utils {
    use super::*;
    use std::cell::RefCell;
    use std::collections::BTreeMap;

    /// Mock repository for isolated testing.
    /// Each instance has its own storage - no shared global state.
    #[derive(Default)]
    pub struct MockTokenFeeRepository {
        store: RefCell<BTreeMap<String, CachedFee>>,
    }

    impl MockTokenFeeRepository {
        pub fn new() -> Self {
            Self::default()
        }
    }

    impl TokenFeeRepository for MockTokenFeeRepository {
        fn get(&self, key: &str) -> Option<CachedFee> {
            self.store.borrow().get(key).cloned()
        }

        fn insert(&self, key: &str, fee: CachedFee) {
            self.store.borrow_mut().insert(key.to_string(), fee);
        }

        fn remove(&self, key: &str) {
            self.store.borrow_mut().remove(key);
        }

        fn clear(&self) {
            self.store.borrow_mut().clear();
        }
    }
}
