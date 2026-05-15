// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_mple_structures::{CellStructure, VersionedStableCell};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::token::{TokenRegistryMetadata, TokenRegistryMetadataCodec};

/// Store for TokenRegistryMetadataRepository
pub type TokenRegistryMetadataRepositoryStorage = VersionedStableCell<
    TokenRegistryMetadata,
    TokenRegistryMetadataCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalTokenRegistryMetadataRepositoryStorage =
    &'static LocalKey<RefCell<TokenRegistryMetadataRepositoryStorage>>;

pub struct TokenRegistryMetadataRepository<S: Storage<TokenRegistryMetadataRepositoryStorage>> {
    token_store: S,
}

impl<S: Storage<TokenRegistryMetadataRepositoryStorage>> TokenRegistryMetadataRepository<S> {
    /// Create a new TokenRegistryMetadataRepository
    pub fn new(storage: S) -> Self {
        Self {
            token_store: storage,
        }
    }

    /// Get the metadata of the token registry
    /// # Returns
    /// * `TokenRegistryMetadata` - The metadata of the token registry
    pub fn get(&self) -> TokenRegistryMetadata {
        self.token_store
            .with_borrow(|store| store.get().into_owned())
    }

    /// Increase the version of the token registry metadata
    /// # Arguments
    /// * `updated_at` - The timestamp of the update
    /// # Returns
    /// * `u64` - The new version of the token registry metadata
    pub fn increase_version(&mut self, updated_at: u64) -> u64 {
        self.token_store.with_borrow_mut(|store| {
            let mut metadata = store.get().into_owned();
            metadata.version += 1;
            metadata.last_updated = updated_at;
            store.set(metadata);

            let updated_metadata = store.get().clone();
            updated_metadata.version
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::repository::{Repositories, tests::TestRepositories};

    const TEST_TIMESTAMP: u64 = 1_234_567_890;

    #[test]
    fn it_should_do_get_default_metadata() {
        // Arrange
        let repo = TestRepositories::new();
        let token_registry_metadata_repository = repo.token_registry_metadata();

        // Act
        let result = token_registry_metadata_repository.get();

        // Assert
        assert_eq!(result.version, 1);
        assert_eq!(result.last_updated, 0);
    }

    #[test]
    fn it_should_do_increase_version() {
        // Arrange
        let repo = TestRepositories::new();
        let mut token_registry_metadata_repository = repo.token_registry_metadata();

        // Act
        let result = token_registry_metadata_repository.increase_version(TEST_TIMESTAMP);

        // Assert
        assert_eq!(result, 2);
        assert_eq!(token_registry_metadata_repository.get().version, 2);
        assert_eq!(
            token_registry_metadata_repository.get().last_updated,
            TEST_TIMESTAMP
        );
    }

    #[test]
    fn it_should_do_increase_version_multiple_times() {
        // Arrange
        let repo = TestRepositories::new();
        let mut token_registry_metadata_repository = repo.token_registry_metadata();

        // Act
        token_registry_metadata_repository.increase_version(TEST_TIMESTAMP);
        let result = token_registry_metadata_repository.increase_version(TEST_TIMESTAMP + 1);

        // Assert
        assert_eq!(result, 3);
        assert_eq!(token_registry_metadata_repository.get().version, 3);
        assert_eq!(
            token_registry_metadata_repository.get().last_updated,
            TEST_TIMESTAMP + 1
        );
    }
}
