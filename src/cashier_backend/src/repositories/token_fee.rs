// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::token_fee::CachedFee;
use ic_mple_log::service::Storage;
use std::collections::BTreeMap;

/// Storage type for token fee cache - volatile BTreeMap
pub type TokenFeeRepositoryStorage = BTreeMap<Principal, CachedFee>;

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
    pub fn get(&self, key: &Principal) -> Option<CachedFee> {
        self.storage.with_borrow(|s| s.get(key).cloned())
    }

    /// Insert or update cached fee
    pub fn insert(&mut self, key: &Principal, fee: CachedFee) {
        self.storage.with_borrow_mut(|s| {
            s.insert(*key, fee);
        });
    }

    /// Remove cached fee for specific token
    pub fn remove(&mut self, key: &Principal) {
        self.storage.with_borrow_mut(|s| {
            s.remove(key);
        });
    }

    /// Clear all cached fees
    pub fn clear(&mut self) {
        self.storage.with_borrow_mut(BTreeMap::clear);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use candid::Nat;

    #[test]
    fn it_should_store_and_retrieve_token_fee() {
        // Arrange
        let mut repo = TestRepositories::new().token_fee();
        let token_principal = Principal::from_text("aaaaa-aa").unwrap();
        let cached_fee = CachedFee {
            fee: Nat::from(100u64),
            updated_at: 1_632_144_000_000_000_000,
        };

        // Act
        repo.insert(&token_principal, cached_fee.clone());

        // Assert
        let retrieved_fee = repo.get(&token_principal).unwrap();
        assert_eq!(retrieved_fee.fee, cached_fee.fee);
        assert_eq!(retrieved_fee.updated_at, cached_fee.updated_at);
    }
}
