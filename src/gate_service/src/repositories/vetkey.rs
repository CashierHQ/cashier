// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::cell::RefCell;

thread_local! {
    static VETKEY_CACHE: RefCell<Option<[u8; 32]>> = const { RefCell::new(None) };
}

/// In-memory (heap) cache for the vetKD-derived AES-256 key.
///
/// The derived key is deterministic for a given canister instance and IC network key,
/// so it is safe to derive once and reuse. The cache is cleared automatically on
/// canister upgrade (heap memory is not preserved across upgrades).
pub struct VetKeyRepository;

impl VetKeyRepository {
    /// Creates a new repository handle backed by the module-level thread-local cache.
    pub fn new() -> Self {
        Self
    }

    /// Returns the cached 32-byte AES-256 key, or `None` if it has not yet been derived.
    pub fn get_cached_key(&self) -> Option<[u8; 32]> {
        VETKEY_CACHE.with(|c| *c.borrow())
    }

    /// Stores a derived 32-byte AES-256 key for reuse within this canister instance.
    /// # Arguments
    /// * `key`: The 32-byte AES-256 key to cache.
    pub fn set_cached_key(&self, key: [u8; 32]) {
        VETKEY_CACHE.with(|c| *c.borrow_mut() = Some(key));
    }

    /// Evicts the cached key, forcing re-derivation on the next call to `derive_aes_key`.
    #[allow(dead_code)]
    pub fn clear_cached_key(&self) {
        VETKEY_CACHE.with(|c| *c.borrow_mut() = None);
    }
}

impl Default for VetKeyRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_return_none_when_cache_is_empty() {
        // Arrange
        let repo = VetKeyRepository::new();
        repo.clear_cached_key();

        // Act
        let result = repo.get_cached_key();

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_store_and_retrieve_vetkey() {
        // Arrange
        let repo = VetKeyRepository::new();
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
        let repo = VetKeyRepository::new();
        repo.set_cached_key([1u8; 32]);

        // Act
        repo.clear_cached_key();
        let result = repo.get_cached_key();

        // Assert
        assert!(result.is_none());
    }
}
