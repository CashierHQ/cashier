use crate::{gates::GateVerifier, utils::verify_password};
use async_trait::async_trait;
use gate_service_types::{error::GateServiceError, GateKey, VerificationResult};
use std::fmt::Debug;

pub struct PasswordGate {
    password_hash: String,
}

#[async_trait]
impl GateVerifier for PasswordGate {
    async fn verify(&self, key: GateKey) -> Result<VerificationResult, GateServiceError> {
        if let GateKey::Password(provided_key) = key {
            match verify_password(&provided_key, &self.password_hash) {
                Ok(()) => Ok(VerificationResult::Success),
                Err(e) => Err(GateServiceError::KeyVerificationFailed(format!(
                    "Error verifying password: {}",
                    e
                ))),
            }
        } else {
            Err(GateServiceError::InvalidKeyType("PasswordGate".to_string()))
        }
    }
}

impl Debug for PasswordGate {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "PasswordGate")
    }
}

impl PasswordGate {
    pub fn new(password_hash: String) -> Self {
        Self { password_hash }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::hash_password;
    use core::panic;

    #[tokio::test]
    async fn it_should_error_verify_password_due_to_wrong_password() {
        // Arrange
        let password = "password123";
        let wrong_password = "wrongpassword";
        let password_hash = hash_password(password).unwrap();
        let password_gate = PasswordGate::new(password_hash);

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
        let password_gate = PasswordGate::new(password_hash);

        // Act
        let result = password_gate
            .verify(GateKey::XFollowing(password.to_string()))
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("PasswordGate"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[tokio::test]
    async fn it_should_verify_correct_password() {
        // Arrange
        let password = "password123";
        let password_hash = hash_password(password).unwrap();
        let password_gate = PasswordGate::new(password_hash);

        // Act
        let result = password_gate
            .verify(GateKey::Password(password.to_string()))
            .await;

        // Assert
        assert_eq!(result, Ok(VerificationResult::Success));
    }
}
