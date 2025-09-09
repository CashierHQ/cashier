pub mod password;

use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
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
    /// Creates a new GateVerifier instance.
    /// This gate instance will be used to verify the provided key.
    /// # Arguments
    /// * `gate_type`: The type of the gate to be created.
    /// * `gate_key`: The key to be used for the gate.
    /// # Returns
    /// * `Ok(Box<dyn GateVerifier + Send + Sync>)`: If the gate is created successfully.
    /// * `Err(String)`: If there is an error during gate creation.
    pub fn get_gate_verifier(
        &self,
        gate_key: GateKey,
    ) -> Result<Box<dyn GateVerifier + Send + Sync>, GateServiceError> {
        match gate_key {
            GateKey::Password(password_hash) => {
                let gate = PasswordGateVerifier::new(password_hash);
                Ok(Box::new(gate))
            }
            _ => Err(GateServiceError::UnsupportedGateKey(format!(
                "{:?}",
                gate_key
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_error_get_gate_verifier_due_to_unsupported_gate_type() {
        // Arrange
        let factory = GateFactory {};
        let gate_key = GateKey::XFollowing("elon_musk".to_string());

        // Act
        let result = factory.get_gate_verifier(gate_key);

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::UnsupportedGateKey(e)) = result {
            assert!(e.contains("XFollowing"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[test]
    fn it_should_success_get_gate_verifier_password() {
        // Arrange
        let factory = GateFactory {};
        let gate_key = GateKey::Password("0xabc".to_string());

        // Act
        let result = factory.get_gate_verifier(gate_key);

        // Assert
        assert!(result.is_ok());
    }
}
