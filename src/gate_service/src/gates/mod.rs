// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod otp;
pub mod password;
pub mod x;

use crate::services::http::HttpOutcallService;
use crate::services::secret::SecretService;
use candid::Principal;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use otp::{OTPEmailVerifier, OTPSmsVerifier};
use password::PasswordGateVerifier;
use std::fmt::Debug;
use x::{XFollowingVerifier, XLikedPostVerifier, XOwnedAccountVerifier, XRetweetedPostVerifier};

pub trait GateVerifier: Debug {
    /// Verifies the provided key against the gate's configured key.
    /// # Arguments
    /// * `key`: The credential supplied by the caller (e.g. `XFollowing("alice")`).
    /// * `http`: HTTP outcall service for verifiers that call external APIs.
    /// * `secrets`: Secret service for verifiers that need stored credentials.
    /// # Returns
    /// * `Ok(VerificationResult::Success)`: The credential satisfies the gate.
    /// * `Ok(VerificationResult::Failure(_))`: The credential is valid but does not satisfy the gate.
    /// * `Err(GateServiceError)`: An error occurred during verification.
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        http: &H,
        secrets: &S,
    ) -> Result<VerificationResult, GateServiceError>;
}

/// Dispatches verification to the correct verifier based on the gate's stored key type.
/// # Arguments
/// * `gate_config_key`: The key stored for the gate (e.g. `XFollowing("cashierapp")`).
/// * `user_key`: The credential supplied by the caller at open time.
/// * `gate_id`: The ID of the gate being opened (required by OTP verifiers to look up state).
/// * `user`: The principal of the claimer (required by OTP verifiers to look up state).
/// * `http`: HTTP outcall service passed through to the chosen verifier.
/// * `secrets`: Secret service passed through to the chosen verifier.
/// * `current_time`: Current IC time in nanoseconds, forwarded to OTP verifiers for expiry checks.
/// # Returns
/// * `Ok(VerificationResult)`: Verification completed (may be Success or Failure).
/// * `Err(GateServiceError::UnsupportedGateKey)`: The gate type has no registered verifier.
/// * `Err(GateServiceError)`: A verifier-level error occurred.
pub async fn verify_gate<H: HttpOutcallService, S: SecretService>(
    gate_config_key: GateKey,
    user_key: GateKey,
    gate_id: &str,
    user: Principal,
    http: &H,
    secrets: &S,
    current_time: u64,
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
        GateKey::OTPEmail(_) => {
            OTPEmailVerifier::new(gate_id.to_string(), user)
                .verify_with_time(user_key, http, secrets, current_time)
                .await
        }
        GateKey::OTPSms(_) => {
            OTPSmsVerifier::new(gate_id.to_string(), user)
                .verify_with_time(user_key, http, secrets, current_time)
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
    use cashier_common::test_utils::random_principal_id;
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
        let user = random_principal_id();

        // Act
        let result = verify_gate(
            gate_key,
            GateKey::Password("x".into()),
            "test_gate_id",
            user,
            &http,
            &secrets,
            0,
        )
        .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::UnsupportedGateKey(_))
        ));
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
        let user = random_principal_id();

        // Act
        let result = verify_gate(
            gate_config,
            GateKey::Password("password123".into()),
            "test_gate_id",
            user,
            &http,
            &secrets,
            0,
        )
        .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }
}
