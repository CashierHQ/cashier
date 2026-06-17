// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gates::GateVerifier,
    services::{http::HttpOutcallService, secret::SecretService},
    utils::hashing::{verify_password, verify_password_sha256},
};
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use std::fmt::Debug;

pub struct PasswordGateVerifier {
    password_hash: String,
}

impl GateVerifier for PasswordGateVerifier {
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        _http: &H,
        _secrets: &S,
    ) -> Result<VerificationResult, GateServiceError> {
        if let GateKey::Password(provided_key) = key {
            let verify_result = if self.password_hash.starts_with("sha256$") {
                verify_password_sha256(&provided_key, &self.password_hash)
            } else {
                verify_password(&provided_key, &self.password_hash)
            };
            match verify_result {
                Ok(()) => Ok(VerificationResult::Success),
                Err(e) => Err(GateServiceError::KeyVerificationFailed(format!(
                    "Error verifying password: {}",
                    e
                ))),
            }
        } else {
            Err(GateServiceError::InvalidKeyType(
                "PasswordGateVerifier".to_string(),
            ))
        }
    }
}

impl Debug for PasswordGateVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "PasswordGateVerifier")
    }
}

impl PasswordGateVerifier {
    pub fn new(password_hash: String) -> Self {
        Self { password_hash }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use crate::utils::hashing::{hash_password, hash_password_sha256};
    use std::collections::HashMap;

    fn fixture_of_services() -> (MockHttpOutcallService, MockSecretService) {
        (
            MockHttpOutcallService::new(vec![]),
            MockSecretService::new(HashMap::new()),
        )
    }

    #[tokio::test]
    async fn it_should_error_verify_password_due_to_wrong_password() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let password_hash = hash_password("password123").unwrap();
        let verifier = PasswordGateVerifier::new(password_hash);

        // Act
        let result = verifier
            .verify(
                GateKey::Password("wrongpassword".to_string()),
                &http,
                &secrets,
            )
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(e)) = result {
            assert!(e.contains("Error verifying password"));
        } else {
            panic!("Expected KeyVerificationFailed but got {:?}", result);
        }
    }

    #[tokio::test]
    async fn it_should_error_verify_password_due_to_invalid_gate_key() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let password_hash = hash_password("password123").unwrap();
        let verifier = PasswordGateVerifier::new(password_hash);

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("cashierapp".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("PasswordGateVerifier"));
        } else {
            panic!("Expected InvalidKeyType but got {:?}", result);
        }
    }

    #[tokio::test]
    async fn it_should_verify_correct_password() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let password_hash = hash_password("password123").unwrap();
        let verifier = PasswordGateVerifier::new(password_hash);

        // Act
        let result = verifier
            .verify(
                GateKey::Password("password123".to_string()),
                &http,
                &secrets,
            )
            .await;

        // Assert
        assert_eq!(result, Ok(VerificationResult::Success));
    }

    #[tokio::test]
    async fn it_should_error_verify_sha256_password_due_to_wrong_password() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let password_hash = hash_password_sha256("password123").unwrap();
        let verifier = PasswordGateVerifier::new(password_hash);

        // Act
        let result = verifier
            .verify(
                GateKey::Password("wrongpassword".to_string()),
                &http,
                &secrets,
            )
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(e)) = result {
            assert!(e.contains("Error verifying password"));
        } else {
            panic!("Expected KeyVerificationFailed");
        }
    }

    #[tokio::test]
    async fn it_should_verify_correct_sha256_password() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let password_hash = hash_password_sha256("password123").unwrap();
        let verifier = PasswordGateVerifier::new(password_hash);

        // Act
        let result = verifier
            .verify(
                GateKey::Password("password123".to_string()),
                &http,
                &secrets,
            )
            .await;

        // Assert
        assert_eq!(result, Ok(VerificationResult::Success));
    }
}
