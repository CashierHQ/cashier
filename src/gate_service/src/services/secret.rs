// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::{Repositories, ThreadlocalRepositories};
use gate_service_types::error::GateServiceError;

/// Abstraction over encrypted secret retrieval, injectable for unit testing.
pub trait SecretService {
    /// Retrieves a named secret value.
    /// # Arguments
    /// * `key`: The logical name of the secret (e.g. `"twitter_api_key"`).
    /// # Returns
    /// * `Ok(String)`: The plaintext secret value.
    /// * `Err(GateServiceError)`: The secret was not found or could not be decrypted.
    async fn get_secret(&self, key: &str) -> Result<String, GateServiceError>;
}

/// Production implementation that reads from stable memory via vetKD decryption.
pub struct IcSecretService;

impl SecretService for IcSecretService {
    async fn get_secret(&self, key: &str) -> Result<String, GateServiceError> {
        ThreadlocalRepositories
            .secrets()
            .get_decrypted_secret(key)
            .await
    }
}

#[cfg(test)]
pub mod test_utils {
    use super::*;
    use std::collections::HashMap;

    /// Test double for `SecretService` backed by an in-memory key→value map.
    pub struct MockSecretService {
        secrets: HashMap<String, String>,
    }

    impl MockSecretService {
        /// Creates a mock with a pre-loaded secret map.
        /// # Arguments
        /// * `secrets`: Map of secret name → plaintext value.
        pub fn new(secrets: HashMap<String, String>) -> Self {
            Self { secrets }
        }

        /// Convenience constructor with a single secret entry.
        /// # Arguments
        /// * `key`: The secret name.
        /// * `value`: The plaintext value for that secret.
        pub fn with_entry(key: &str, value: &str) -> Self {
            let mut map = HashMap::new();
            map.insert(key.to_string(), value.to_string());
            Self::new(map)
        }
    }

    impl SecretService for MockSecretService {
        async fn get_secret(&self, key: &str) -> Result<String, GateServiceError> {
            self.secrets.get(key).cloned().ok_or_else(|| {
                GateServiceError::KeyVerificationFailed(format!(
                    "secret '{key}' not configured in mock"
                ))
            })
        }
    }
}
