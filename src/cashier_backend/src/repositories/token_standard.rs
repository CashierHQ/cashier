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
            s.insert(key.clone(), cached_standard);
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
    use token_storage_types::token::IcrcStandard;

    #[test]
    fn it_should_store_and_retrieve_token_standard() {
        // Arrange
        let mut repo = TestRepositories::new().token_standard();

        let token_principal = Principal::from_text("aaaaa-aa").unwrap();
        let cached_standards = CachedTokenStandard {
            standards: vec![IcrcStandard::ICRC1],
            updated_at: 0,
        };

        // Act
        repo.insert(&token_principal, cached_standards.clone());

        // Assert
        let retrieved = repo.get(&token_principal);
        assert_eq!(retrieved, Some(cached_standards));

        // Act
        repo.remove(&token_principal);

        // Assert
        let retrieved_after_removal = repo.get(&token_principal);
        assert_eq!(retrieved_after_removal, None);
    }
}
