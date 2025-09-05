pub mod password;

use gate_service_types::{error::GateServiceError, GateKey, GateType, VerificationResult};
use password::PasswordGateVerifier;
use std::{fmt::Debug, future::Future, pin::Pin};

pub trait GateVerifier: Debug {
    /// Verifies the provided key against the gate's key.
    /// # Arguments
    /// * `key`: The key to be verified.
    /// # Returns
    /// * `Ok(VerificationResult)`: If the key is verified successfully.
    /// * `Err(String)`: If there is an error during verification.
    fn verify(
        &self,
        key: GateKey,
    ) -> Pin<Box<dyn Future<Output = Result<VerificationResult, GateServiceError>>>>;
}

pub struct GateFactory {}

impl GateFactory {
    /// Creates a new gate instance of `GateVerifier` trait.
    /// This gate instance will be used to verify the provided key.
    /// # Arguments
    /// * `gate_type`: The type of the gate to be created.
    /// * `gate_key`: The key to be used for the gate.
    /// # Returns
    /// * `Ok(Box<dyn GateVerifier + Send + Sync>)`: If the gate is created successfully.
    /// * `Err(String)`: If there is an error during gate creation.
    pub fn create_gate(
        &self,
        gate_type: GateType,
        gate_key: GateKey,
    ) -> Result<Box<dyn GateVerifier + Send + Sync>, GateServiceError> {
        match gate_type {
            GateType::Password => {
                let GateKey::Password(gate_key) = gate_key else {
                    return Err(GateServiceError::InvalidKeyType(
                        "PasswordGateVerifier".to_string(),
                    ));
                };
                let gate = PasswordGateVerifier::new(gate_key);
                Ok(Box::new(gate))
            }
            _ => Err(GateServiceError::UnsupportedGateType(format!(
                "{:?}",
                gate_type
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_error_create_gate_due_to_unsupported_gate_type() {
        // Arrange
        let factory = GateFactory {};
        let gate_type = GateType::XFollowing;
        let gate_key = GateKey::XFollowing("elon_musk".to_string());

        // Act
        let result = factory.create_gate(gate_type, gate_key);

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::UnsupportedGateType(e)) = result {
            assert!(e.contains("XFollowing"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[test]
    fn it_should_error_create_gate_due_to_invalid_key_type() {
        // Arrange
        let factory = GateFactory {};
        let gate_type = GateType::Password;
        let gate_key = GateKey::XFollowing("elon_musk".to_string());

        // Act
        let result = factory.create_gate(gate_type, gate_key);

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("PasswordGateVerifier"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[test]
    fn it_should_success_create_gate_password() {
        // Arrange
        let factory = GateFactory {};
        let gate_type = GateType::Password;
        let gate_key = GateKey::Password("password".to_string());

        // Act
        let result = factory.create_gate(gate_type, gate_key);

        // Assert
        assert!(result.is_ok());
    }
}
