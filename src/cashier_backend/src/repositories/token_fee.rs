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

    fn fixture_of_cached_fee(fee: u64, updated_at: u64) -> CachedFee {
        CachedFee {
            fee: Nat::from(fee),
            updated_at,
        }
    }

    #[test]
    fn it_should_fail_get_token_fee_due_to_missing_token_key() {
        // Arrange
        let repo = TestRepositories::new().token_fee();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");

        // Act
        let retrieved_fee = repo.get(&token_principal);

        // Assert
        assert!(retrieved_fee.is_none());
    }

    #[test]
    fn it_should_fail_remove_token_fee_due_to_missing_token_key() {
        // Arrange
        let mut repo = TestRepositories::new().token_fee();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");

        // Act
        repo.remove(&token_principal);

        // Assert
        assert!(repo.get(&token_principal).is_none());
    }

    #[test]
    fn it_should_succeed_store_and_retrieve_token_fee() {
        // Arrange
        let mut repo = TestRepositories::new().token_fee();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");
        let cached_fee = fixture_of_cached_fee(100, 1_632_144_000_000_000_000);

        // Act
        repo.insert(&token_principal, cached_fee.clone());

        // Assert
        let retrieved_fee = repo.get(&token_principal).expect("fee should exist");
        assert_eq!(retrieved_fee.fee, cached_fee.fee);
        assert_eq!(retrieved_fee.updated_at, cached_fee.updated_at);
    }

    #[test]
    fn it_should_succeed_overwrite_token_fee_due_to_same_token_key() {
        // Arrange
        let mut repo = TestRepositories::new().token_fee();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");
        let old_fee = fixture_of_cached_fee(100, 1_632_144_000_000_000_000);
        let new_fee = fixture_of_cached_fee(200, 1_732_144_000_000_000_000);
        repo.insert(&token_principal, old_fee);

        // Act
        repo.insert(&token_principal, new_fee.clone());

        // Assert
        let retrieved_fee = repo.get(&token_principal).expect("fee should exist");
        assert_eq!(retrieved_fee.fee, new_fee.fee);
        assert_eq!(retrieved_fee.updated_at, new_fee.updated_at);
    }

    #[test]
    fn it_should_succeed_remove_token_fee() {
        // Arrange
        let mut repo = TestRepositories::new().token_fee();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");
        repo.insert(
            &token_principal,
            fixture_of_cached_fee(100, 1_632_144_000_000_000_000),
        );

        // Act
        repo.remove(&token_principal);

        // Assert
        assert!(repo.get(&token_principal).is_none());
    }

    #[test]
    fn it_should_succeed_clear_all_token_fees() {
        // Arrange
        let mut repo = TestRepositories::new().token_fee();
        let token_principal_1 = Principal::from_text("aaaaa-aa").expect("valid principal");
        let token_principal_2 =
            Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").expect("valid principal");
        repo.insert(
            &token_principal_1,
            fixture_of_cached_fee(100, 1_632_144_000_000_000_000),
        );
        repo.insert(
            &token_principal_2,
            fixture_of_cached_fee(250, 1_732_144_000_000_000_000),
        );

        // Act
        repo.clear();

        // Assert
        assert!(repo.get(&token_principal_1).is_none());
        assert!(repo.get(&token_principal_2).is_none());
    }
}
