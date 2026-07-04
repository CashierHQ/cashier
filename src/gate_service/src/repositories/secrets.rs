// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::utils::{crypto::aes_decrypt, vetkd::derive_aes_key};
use gate_service_types::{SecretStorageMode, error::GateServiceError};
use ic_mple_log::service::Storage;
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell};

/// Stores AES-256-GCM encrypted secrets as `nonce || ciphertext` byte blobs.
/// Secrets are encrypted client-side using the canister's vetKD public key.
pub type SecretsStorage = StableBTreeMap<String, Vec<u8>, VirtualMemory<DefaultMemoryImpl>>;

/// Stores plain-text secrets as raw UTF-8 strings (used in PlainText storage mode).
pub type PlainSecretsStorage = StableBTreeMap<String, String, VirtualMemory<DefaultMemoryImpl>>;

/// Persists the active secret storage mode across upgrades.
pub type SecretStorageModeStorage = StableCell<SecretStorageMode, VirtualMemory<DefaultMemoryImpl>>;

/// Repository for managing named secrets backed by stable-memory stores.
///
/// Supports two storage modes:
/// - `PlainText`: secrets are stored as raw UTF-8 strings (development / testing).
/// - `VetKey`: secrets are stored as AES-256-GCM ciphertext and decrypted on read via vetKD.
pub struct SecretRepository<E, P, M>
where
    E: Storage<SecretsStorage>,
    P: Storage<PlainSecretsStorage>,
    M: Storage<SecretStorageModeStorage>,
{
    encrypted: E,
    plain: P,
    mode: M,
}

impl<E, P, M> SecretRepository<E, P, M>
where
    E: Storage<SecretsStorage>,
    P: Storage<PlainSecretsStorage>,
    M: Storage<SecretStorageModeStorage>,
{
    /// Creates a new `SecretRepository` backed by the provided stable-memory stores.
    /// # Arguments
    /// * `encrypted`: Store for AES-256-GCM encrypted secrets (`nonce || ciphertext` blobs).
    /// * `plain`: Store for plain-text secrets (used in `PlainText` mode).
    /// * `mode`: Cell persisting the active storage mode.
    pub fn new(encrypted: E, plain: P, mode: M) -> Self {
        Self {
            encrypted,
            plain,
            mode,
        }
    }

    /// Reads the raw encrypted ciphertext for a secret by name.
    /// # Arguments
    /// * `key`: Logical secret name (e.g. `"twitter_api_key"`).
    /// # Returns
    /// * `Some(Vec<u8>)`: The stored `nonce || ciphertext` blob.
    /// * `None`: No secret with that name has been stored.
    pub fn get_secret_ciphertext(&self, key: &str) -> Option<Vec<u8>> {
        self.encrypted.with_borrow(|m| m.get(&key.to_string()))
    }

    /// Retrieves a named secret, using the active storage mode to decide how to read it.
    ///
    /// - `PlainText`: reads directly from the plain-text store (no async canister calls).
    /// - `VetKey`: decrypts via a vetKD-derived AES key (cached after the first derivation).
    /// # Arguments
    /// * `key`: Logical secret name (e.g. `"twitter_api_key"`).
    /// # Returns
    /// * `Ok(String)`: Plaintext secret value.
    /// * `Err(GateServiceError::KeyVerificationFailed)`: Secret not found, decryption failed,
    ///   or the decrypted bytes are not valid UTF-8.
    pub async fn get_decrypted_secret(&self, key: &str) -> Result<String, GateServiceError> {
        let mode = self.mode.with_borrow(|m| m.get().clone());

        match mode {
            SecretStorageMode::PlainText => self
                .plain
                .with_borrow(|m| m.get(&key.to_string()))
                .ok_or_else(|| {
                    GateServiceError::KeyVerificationFailed(format!(
                        "{key} not configured in plain-text store"
                    ))
                }),
            SecretStorageMode::VetKey => {
                let ciphertext = self.get_secret_ciphertext(key).ok_or_else(|| {
                    GateServiceError::KeyVerificationFailed(format!("{key} not configured"))
                })?;

                let aes_key = derive_aes_key().await?;
                let plaintext = aes_decrypt(&ciphertext, &aes_key)?;

                String::from_utf8(plaintext)
                    .map_err(|e| GateServiceError::KeyVerificationFailed(format!("utf8: {e}")))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::random_id_string;

    fn assert_key_verification_error_contains(
        result: Result<String, GateServiceError>,
        expected: &str,
    ) {
        match result {
            Err(GateServiceError::KeyVerificationFailed(message)) => {
                assert!(
                    message.contains(expected),
                    "Expected error containing '{expected}', got: {message}"
                );
            }
            other => panic!("Expected KeyVerificationFailed, got {other:?}"),
        }
    }

    #[test]
    fn it_should_return_none_when_secret_ciphertext_does_not_exist() {
        // Arrange
        let repo = TestRepositories::new().secrets();
        let key = random_id_string();

        // Act
        let result = repo.get_secret_ciphertext(&key);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_get_secret_ciphertext() {
        // Arrange
        let mut repo = TestRepositories::new().secrets();
        let key = random_id_string();
        let ciphertext = vec![1, 2, 3, 4, 5];
        repo.encrypted
            .with_borrow_mut(|store| store.insert(key.clone(), ciphertext.clone()));

        // Act
        let result = repo.get_secret_ciphertext(&key);

        // Assert
        assert_eq!(result, Some(ciphertext));
    }

    #[test]
    fn it_should_return_cloned_secret_ciphertext_without_mutating_storage() {
        // Arrange
        let mut repo = TestRepositories::new().secrets();
        let key = random_id_string();
        let ciphertext = vec![1, 2, 3, 4, 5];
        repo.encrypted
            .with_borrow_mut(|store| store.insert(key.clone(), ciphertext.clone()));

        // Act
        let mut result = repo
            .get_secret_ciphertext(&key)
            .expect("ciphertext should exist");
        result.push(6);

        // Assert
        assert_eq!(repo.get_secret_ciphertext(&key), Some(ciphertext));
    }

    #[tokio::test]
    async fn it_should_get_plain_text_secret_when_mode_is_plain_text() {
        // Arrange
        let mut repo = TestRepositories::new().secrets();
        let key = random_id_string();
        let value = "secret-value".to_string();
        repo.plain
            .with_borrow_mut(|store| store.insert(key.clone(), value.clone()));

        // Act
        let result = repo.get_decrypted_secret(&key).await;

        // Assert
        assert_eq!(result.unwrap(), value);
    }

    #[tokio::test]
    async fn it_should_return_error_when_plain_text_secret_does_not_exist() {
        // Arrange
        let repo = TestRepositories::new().secrets();
        let key = random_id_string();

        // Act
        let result = repo.get_decrypted_secret(&key).await;

        // Assert
        assert_key_verification_error_contains(result, "not configured in plain-text store");
    }

    #[tokio::test]
    async fn it_should_ignore_ciphertext_store_when_mode_is_plain_text() {
        // Arrange
        let mut repo = TestRepositories::new().secrets();
        let key = random_id_string();
        repo.encrypted
            .with_borrow_mut(|store| store.insert(key.clone(), vec![1, 2, 3]));

        // Act
        let result = repo.get_decrypted_secret(&key).await;

        // Assert
        assert_key_verification_error_contains(result, "not configured in plain-text store");
    }

    #[tokio::test]
    async fn it_should_return_error_when_vetkey_secret_ciphertext_does_not_exist() {
        // Arrange
        let mut repo = TestRepositories::new().secrets();
        let key = random_id_string();
        repo.mode.with_borrow_mut(|mode| {
            let _ = mode.set(SecretStorageMode::VetKey);
        });

        // Act
        let result = repo.get_decrypted_secret(&key).await;

        // Assert
        assert_key_verification_error_contains(result, "not configured");
    }

    #[test]
    fn it_should_share_secret_stores_across_repositories_with_same_storage() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut first_repo = repositories.secrets();
        let second_repo = repositories.secrets();
        let key = random_id_string();
        let ciphertext = vec![9, 8, 7];
        first_repo
            .encrypted
            .with_borrow_mut(|store| store.insert(key.clone(), ciphertext.clone()));

        // Act
        let result = second_repo.get_secret_ciphertext(&key);

        // Assert
        assert_eq!(result, Some(ciphertext));
    }

    #[tokio::test]
    async fn it_should_share_secret_mode_across_repositories_with_same_storage() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut first_repo = repositories.secrets();
        let second_repo = repositories.secrets();
        let key = random_id_string();
        first_repo.mode.with_borrow_mut(|mode| {
            let _ = mode.set(SecretStorageMode::VetKey);
        });

        // Act
        let result = second_repo.get_decrypted_secret(&key).await;

        // Assert
        assert_key_verification_error_contains(result, "not configured");
    }
}
