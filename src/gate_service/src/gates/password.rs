use crate::{gates::GateVerifier, utils::hashing::verify_password};
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use std::{fmt::Debug, future::Future, pin::Pin};

pub struct PasswordGateVerifier {
    password_hash: String,
}

impl GateVerifier for PasswordGateVerifier {
    fn verify(
        &self,
        key: GateKey,
    ) -> Pin<Box<dyn Future<Output = Result<VerificationResult, GateServiceError>>>> {
        let password_hash = self.password_hash.clone();
        Box::pin(async move {
            if let GateKey::Password(provided_key) = key {
                match verify_password(&provided_key, &password_hash) {
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
        })
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
    use crate::utils::hashing::hash_password;
    use core::panic;

    #[tokio::test]
    async fn it_should_error_verify_password_due_to_wrong_password() {
        // Arrange
        let password = "password123";
        let wrong_password = "wrongpassword";
        let password_hash = hash_password(password).unwrap();
        let password_gate = PasswordGateVerifier::new(password_hash);

        // Act
        let result = password_gate
            .verify(GateKey::Password(wrong_password.to_string()))
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(e)) = result {
            assert!(e.contains("Error verifying password"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[tokio::test]
    async fn it_should_error_verify_password_due_to_invalid_gate_key() {
        // Arrange
        let password = "password123";
        let password_hash = hash_password(password).unwrap();
        let password_gate = PasswordGateVerifier::new(password_hash);

        // Act
        let result = password_gate
            .verify(GateKey::XFollowing(password.to_string()))
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("PasswordGateVerifier"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[tokio::test]
    async fn it_should_verify_correct_password() {
        // Arrange
        let password = "password123";
        let password_hash = hash_password(password).unwrap();
        let password_gate = PasswordGateVerifier::new(password_hash);

        // Act
        let result = password_gate
            .verify(GateKey::Password(password.to_string()))
            .await;

        // Assert
        assert_eq!(result, Ok(VerificationResult::Success));
    }
}
