// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repositories::{
        PLAIN_SECRETS_STORE, PlainSecretsStorage, SECRET_STORAGE_MODE, SECRETS_STORE,
        SecretStorageModeStorage, SecretsStorage,
    },
    utils::{crypto::aes_decrypt, vetkd::derive_aes_key},
};
use gate_service_types::{SecretStorageMode, error::GateServiceError};
use ic_mple_log::service::Storage;

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

/// Retrieves a named secret using the active storage mode from the canister's thread-local stores.
pub async fn get_decrypted_secret(key: &str) -> Result<String, GateServiceError> {
    SecretRepository::new(&SECRETS_STORE, &PLAIN_SECRETS_STORE, &SECRET_STORAGE_MODE)
        .get_decrypted_secret(key)
        .await
}
