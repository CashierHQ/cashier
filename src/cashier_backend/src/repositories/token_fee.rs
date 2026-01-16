// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Token fee cache repository for volatile in-memory storage.
//! Uses simple BTreeMap - no stable memory persistence needed.

use cashier_backend_types::repository::token_fee::CachedFee;
use ic_mple_log::service::Storage;
use std::collections::BTreeMap;

/// Storage type for token fee cache - volatile BTreeMap
pub type TokenFeeRepositoryStorage = BTreeMap<String, CachedFee>;

/// Repository for token fee cache operations
pub struct TokenFeeRepository<S: Storage<TokenFeeRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<TokenFeeRepositoryStorage>> TokenFeeRepository<S> {
    /// Create new TokenFeeRepository with given storage
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Get cached fee by token key (principal text)
    pub fn get(&self, key: &str) -> Option<CachedFee> {
        self.storage.with_borrow(|s| s.get(key).cloned())
    }

    /// Insert or update cached fee
    pub fn insert(&mut self, key: &str, fee: CachedFee) {
        self.storage.with_borrow_mut(|s| {
            s.insert(key.to_string(), fee);
        });
    }

    /// Remove cached fee for specific token
    pub fn remove(&mut self, key: &str) {
        self.storage.with_borrow_mut(|s| {
            s.remove(key);
        });
    }

    /// Clear all cached fees
    pub fn clear(&mut self) {
        self.storage.with_borrow_mut(BTreeMap::clear);
    }
}
