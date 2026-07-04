// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use gate_service_types::PasswordHashingAlgorithm;
use ic_mple_log::service::Storage;
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableCell};

/// Persists the active password hashing algorithm across upgrades.
pub type PasswordHashingAlgorithmStorage =
    StableCell<PasswordHashingAlgorithm, VirtualMemory<DefaultMemoryImpl>>;

/// Repository for the password hashing algorithm used for newly-created password gates.
pub struct PasswordHashingAlgorithmRepository<S: Storage<PasswordHashingAlgorithmStorage>> {
    storage: S,
}

impl<S: Storage<PasswordHashingAlgorithmStorage>> PasswordHashingAlgorithmRepository<S> {
    /// Creates a new `PasswordHashingAlgorithmRepository` backed by the provided store.
    /// # Arguments
    /// * `storage`: Stable cell containing the active password hashing algorithm.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Returns the active password hashing algorithm.
    pub fn get(&self) -> PasswordHashingAlgorithm {
        self.storage.with_borrow(|cell| cell.get().clone())
    }

    /// Sets the active password hashing algorithm for future password gate creations.
    /// # Arguments
    /// * `algorithm`: The new password hashing algorithm to persist.
    pub fn set(&mut self, algorithm: PasswordHashingAlgorithm) {
        self.storage.with_borrow_mut(|cell| {
            let _ = cell.set(algorithm);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};

    #[test]
    fn it_should_get_default_password_hashing_algorithm() {
        // Arrange
        let repo = TestRepositories::new().password_hashing_algorithm();

        // Act
        let result = repo.get();

        // Assert
        assert_eq!(result, PasswordHashingAlgorithm::Argon2id);
    }

    #[test]
    fn it_should_set_password_hashing_algorithm() {
        // Arrange
        let mut repo = TestRepositories::new().password_hashing_algorithm();

        // Act
        repo.set(PasswordHashingAlgorithm::Sha256);
        let result = repo.get();

        // Assert
        assert_eq!(result, PasswordHashingAlgorithm::Sha256);
    }

    #[test]
    fn it_should_replace_password_hashing_algorithm() {
        // Arrange
        let mut repo = TestRepositories::new().password_hashing_algorithm();
        repo.set(PasswordHashingAlgorithm::Sha256);

        // Act
        repo.set(PasswordHashingAlgorithm::Argon2id);
        let result = repo.get();

        // Assert
        assert_eq!(result, PasswordHashingAlgorithm::Argon2id);
    }

    #[test]
    fn it_should_share_password_hashing_algorithm_across_repositories_with_same_storage() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut first_repo = repositories.password_hashing_algorithm();
        let second_repo = repositories.password_hashing_algorithm();

        // Act
        first_repo.set(PasswordHashingAlgorithm::Sha256);

        // Assert
        assert_eq!(second_repo.get(), PasswordHashingAlgorithm::Sha256);
    }
}
