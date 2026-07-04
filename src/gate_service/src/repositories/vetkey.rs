// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_mple_log::service::Storage;

pub type VetKeyStorage = Option<[u8; 32]>;

/// In-memory (heap) cache for the vetKD-derived AES-256 key.
///
/// The derived key is deterministic for a given canister instance and IC network key,
/// so it is safe to derive once and reuse. The cache is cleared automatically on
/// canister upgrade (heap memory is not preserved across upgrades).
pub struct VetKeyRepository<S: Storage<VetKeyStorage>> {
    storage: S,
}

impl<S: Storage<VetKeyStorage>> VetKeyRepository<S> {
    /// Creates a new repository backed by the provided store.
    /// # Arguments
    /// * `storage`: Volatile store containing the cached AES-256 key.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Returns the cached 32-byte AES-256 key, or `None` if it has not yet been derived.
    pub fn get_cached_key(&self) -> Option<[u8; 32]> {
        self.storage.with_borrow(|cache| *cache)
    }

    /// Stores a derived 32-byte AES-256 key for reuse within this canister instance.
    /// # Arguments
    /// * `key`: The 32-byte AES-256 key to cache.
    pub fn set_cached_key(&mut self, key: [u8; 32]) {
        self.storage.with_borrow_mut(|cache| *cache = Some(key));
    }

    /// Evicts the cached key, forcing re-derivation on the next call to `derive_aes_key`.
    #[allow(dead_code)]
    pub fn clear_cached_key(&mut self) {
        self.storage.with_borrow_mut(|cache| *cache = None);
    }
}

#[cfg(test)]
mod tests {
    use crate::repositories::{Repositories, tests::TestRepositories};

    #[test]
    fn it_should_return_none_when_cache_is_empty() {
        // Arrange
        let mut repo = TestRepositories::new().vetkey();
        repo.clear_cached_key();

        // Act
        let result = repo.get_cached_key();

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_store_and_retrieve_vetkey() {
        // Arrange
        let mut repo = TestRepositories::new().vetkey();
        repo.clear_cached_key();
        let key = [7u8; 32];

        // Act
        repo.set_cached_key(key);
        let result = repo.get_cached_key();

        // Assert
        assert_eq!(result, Some(key));

        // Cleanup
        repo.clear_cached_key();
    }

    #[test]
    fn it_should_clear_cached_vetkey() {
        // Arrange
        let mut repo = TestRepositories::new().vetkey();
        repo.set_cached_key([1u8; 32]);

        // Act
        repo.clear_cached_key();
        let result = repo.get_cached_key();

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_share_cached_vetkey_across_repositories_with_same_storage() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut first_repo = repositories.vetkey();
        let second_repo = repositories.vetkey();
        let key = [9u8; 32];

        // Act
        first_repo.set_cached_key(key);

        // Assert
        assert_eq!(second_repo.get_cached_key(), Some(key));
    }
}
