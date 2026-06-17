// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use crate::services::{http::HttpOutcallService, secret::SecretService};
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use std::fmt::Debug;

/// Verifier for the X-owned-account gate.
/// Checks that the user's authenticated X handle matches the configured target handle
/// (case-insensitive). No API call required.
pub struct XOwnedAccountVerifier {
    target_handle: String,
}

impl GateVerifier for XOwnedAccountVerifier {
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        _http: &H,
        _secrets: &S,
    ) -> Result<VerificationResult, GateServiceError> {
        let user_handle = match key {
            GateKey::XOwnedAccount(handle) => handle,
            _ => {
                return Err(GateServiceError::InvalidKeyType(
                    "XOwnedAccountVerifier".to_string(),
                ));
            }
        };

        if user_handle.eq_ignore_ascii_case(&self.target_handle) {
            Ok(VerificationResult::Success)
        } else {
            Ok(VerificationResult::Failure(format!(
                "account @{} does not match required @{}",
                user_handle, self.target_handle
            )))
        }
    }
}

impl Debug for XOwnedAccountVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "XOwnedAccountVerifier(target={})", self.target_handle)
    }
}

impl XOwnedAccountVerifier {
    /// Creates a new XOwnedAccountVerifier for the given target handle.
    pub fn new(target_handle: String) -> Self {
        Self { target_handle }
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
    async fn it_should_verify_owned_account_success() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let verifier = XOwnedAccountVerifier::new("CashierApp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XOwnedAccount("cashierapp".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_fail_owned_account_due_to_handle_mismatch() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let verifier = XOwnedAccountVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XOwnedAccount("someone_else".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Failure(_))));
    }

    #[tokio::test]
    async fn it_should_fail_owned_account_due_to_wrong_key_type() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let verifier = XOwnedAccountVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("cashierapp".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
    }
}
