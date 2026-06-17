// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::get_decrypted_secret;
use gate_service_types::error::GateServiceError;

pub trait SecretService {
    async fn get_secret(&self, key: &str) -> Result<String, GateServiceError>;
}

pub struct IcSecretService;

impl SecretService for IcSecretService {
    async fn get_secret(&self, key: &str) -> Result<String, GateServiceError> {
        get_decrypted_secret(key).await
    }
}

#[cfg(test)]
pub mod test_utils {
    use super::*;
    use std::collections::HashMap;

    pub struct MockSecretService {
        secrets: HashMap<String, String>,
    }

    impl MockSecretService {
        pub fn new(secrets: HashMap<String, String>) -> Self {
            Self { secrets }
        }

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
