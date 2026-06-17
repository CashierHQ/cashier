// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod password;
pub mod x;

use crate::services::http::HttpOutcallService;
use crate::services::secret::SecretService;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use password::PasswordGateVerifier;
use std::fmt::Debug;
use x::{XFollowingVerifier, XLikedPostVerifier, XOwnedAccountVerifier, XRetweetedPostVerifier};

pub trait GateVerifier: Debug {
    /// Verifies the provided key against the gate's configured key.
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        http: &H,
        secrets: &S,
    ) -> Result<VerificationResult, GateServiceError>;
}

/// Dispatches verification to the correct verifier based on the gate's stored key type.
///
/// `gate_config_key` is the key read from storage (e.g. `XFollowing("cashierapp")`).
/// `user_key` is the credential supplied by the caller at open time.
pub async fn verify_gate<H: HttpOutcallService, S: SecretService>(
    gate_config_key: GateKey,
    user_key: GateKey,
    http: &H,
    secrets: &S,
) -> Result<VerificationResult, GateServiceError> {
    match gate_config_key {
        GateKey::Password(hash) => {
            PasswordGateVerifier::new(hash)
                .verify(user_key, http, secrets)
                .await
        }
        GateKey::XFollowing(handle) => {
            XFollowingVerifier::new(handle)
                .verify(user_key, http, secrets)
                .await
        }
        GateKey::XOwnedAccount(handle) => {
            XOwnedAccountVerifier::new(handle)
                .verify(user_key, http, secrets)
                .await
        }
        GateKey::XLikedPost(url) => {
            XLikedPostVerifier::new(url)
                .verify(user_key, http, secrets)
                .await
        }
        GateKey::XRetweetedPost(url) => {
            XRetweetedPostVerifier::new(url)
                .verify(user_key, http, secrets)
                .await
        }
        _ => Err(GateServiceError::UnsupportedGateKey(format!(
            "{:?}",
            gate_config_key
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use std::collections::HashMap;

    fn fixture_of_services() -> (MockHttpOutcallService, MockSecretService) {
        (
            MockHttpOutcallService::new(vec![]),
            MockSecretService::new(HashMap::new()),
        )
    }

    #[tokio::test]
    async fn it_should_error_verify_gate_due_to_unsupported_gate_type() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_key = GateKey::TelegramGroup("some_group".to_string());

        // Act
        let result = verify_gate(gate_key, GateKey::Password("x".into()), &http, &secrets).await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::UnsupportedGateKey(_))));
        if let Err(GateServiceError::UnsupportedGateKey(e)) = result {
            assert!(e.contains("TelegramGroup"));
        }
    }

    #[tokio::test]
    async fn it_should_verify_password_gate() {
        // Arrange
        use crate::utils::hashing::hash_password;
        let (http, secrets) = fixture_of_services();
        let hash = hash_password("password123").unwrap();
        let gate_config = GateKey::Password(hash);

        // Act
        let result = verify_gate(
            gate_config,
            GateKey::Password("password123".into()),
            &http,
            &secrets,
        )
        .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }
}
