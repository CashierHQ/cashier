// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::token_standard::CachedTokenStandard;
use ic_mple_log::service::Storage;
use std::collections::BTreeMap;

/// Storage type for token fee cache - volatile BTreeMap
pub type TokenStandardRepositoryStorage = BTreeMap<Principal, CachedTokenStandard>;

/// Repository for token fee cache operations
pub struct TokenStandardRepository<S: Storage<TokenStandardRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<TokenStandardRepositoryStorage>> TokenStandardRepository<S> {
    /// Create new TokenStandardRepository with given storage
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Get cached fee by token key (principal text)
    pub fn get(&self, key: &Principal) -> Option<CachedTokenStandard> {
        self.storage.with_borrow(|s| s.get(key).cloned())
    }

    /// Insert or update cached fee
    pub fn insert(&mut self, key: &Principal, cached_standard: CachedTokenStandard) {
        self.storage.with_borrow_mut(|s| {
            s.insert(*key, cached_standard);
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
    use token_storage_types::token::IcrcStandard;

    fn fixture_of_cached_token_standard(
        standards: Vec<IcrcStandard>,
        updated_at: u64,
    ) -> CachedTokenStandard {
        CachedTokenStandard {
            standards,
            updated_at,
        }
    }

    #[test]
    fn it_should_fail_get_token_standard_due_to_missing_token_key() {
        // Arrange
        let repo = TestRepositories::new().token_standard();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");

        // Act
        let retrieved = repo.get(&token_principal);

        // Assert
        assert!(retrieved.is_none());
    }

    #[test]
    fn it_should_succeed_store_and_retrieve_token_standard() {
        // Arrange
        let mut repo = TestRepositories::new().token_standard();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");
        let cached_standards = fixture_of_cached_token_standard(vec![IcrcStandard::ICRC1], 0);

        // Act
        repo.insert(&token_principal, cached_standards.clone());

        // Assert
        let retrieved = repo.get(&token_principal);
        assert_eq!(retrieved, Some(cached_standards));

        // Act
        repo.clear();

        // Assert
        let retrieved_after_removal = repo.get(&token_principal);
        assert_eq!(retrieved_after_removal, None);
    }

    #[test]
    fn it_should_succeed_overwrite_token_standard_due_to_same_token_key() {
        // Arrange
        let mut repo = TestRepositories::new().token_standard();
        let token_principal = Principal::from_text("aaaaa-aa").expect("valid principal");
        let initial = fixture_of_cached_token_standard(vec![IcrcStandard::ICRC1], 10);
        let updated =
            fixture_of_cached_token_standard(vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2], 20);
        repo.insert(&token_principal, initial);

        // Act
        repo.insert(&token_principal, updated.clone());

        // Assert
        assert_eq!(repo.get(&token_principal), Some(updated));
    }

    #[test]
    fn it_should_succeed_clear_all_token_standards() {
        // Arrange
        let mut repo = TestRepositories::new().token_standard();
        let token_principal_1 = Principal::from_text("aaaaa-aa").expect("valid principal");
        let token_principal_2 =
            Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").expect("valid principal");
        repo.insert(
            &token_principal_1,
            fixture_of_cached_token_standard(vec![IcrcStandard::ICRC1], 10),
        );
        repo.insert(
            &token_principal_2,
            fixture_of_cached_token_standard(vec![IcrcStandard::ICRC2], 20),
        );

        // Act
        repo.clear();

        // Assert
        assert!(repo.get(&token_principal_1).is_none());
        assert!(repo.get(&token_principal_2).is_none());
    }
}
