// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use std::{fmt::Debug, future::Future, pin::Pin};

/// Verifier for the X-owned-account gate.
/// Checks that the user's authenticated X handle matches the configured target handle
/// (case-insensitive). No API call required.
pub struct XOwnedAccountVerifier {
    target_handle: String,
}

impl GateVerifier for XOwnedAccountVerifier {
    fn verify(
        &self,
        key: GateKey,
    ) -> Pin<Box<dyn Future<Output = Result<VerificationResult, GateServiceError>>>> {
        let target_handle = self.target_handle.clone();
        Box::pin(async move {
            let user_handle = match key {
                GateKey::XOwnedAccount(handle) => handle,
                _ => {
                    return Err(GateServiceError::InvalidKeyType(
                        "XOwnedAccountVerifier".to_string(),
                    ));
                }
            };

            if user_handle.eq_ignore_ascii_case(&target_handle) {
                Ok(VerificationResult::Success)
            } else {
                Ok(VerificationResult::Failure(format!(
                    "account @{} does not match required @{}",
                    user_handle, target_handle
                )))
            }
        })
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

    #[tokio::test]
    async fn it_should_verify_owned_account_success() {
        // Arrange
        let verifier = XOwnedAccountVerifier::new("CashierApp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XOwnedAccount("cashierapp".to_string()))
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_fail_owned_account_due_to_handle_mismatch() {
        // Arrange
        let verifier = XOwnedAccountVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XOwnedAccount("someone_else".to_string()))
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Failure(_))));
    }

    #[tokio::test]
    async fn it_should_fail_owned_account_due_to_wrong_key_type() {
        // Arrange
        let verifier = XOwnedAccountVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("cashierapp".to_string()))
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
    }
}
