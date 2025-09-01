pub mod password;

use gate_service_types::{GateKey, GateType, GateVerifier};
use password::PasswordGate;

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
    ) -> Result<Box<dyn GateVerifier + Send + Sync>, String> {
        match gate_type {
            GateType::Password => {
                let GateKey::Password(gate_key) = gate_key else {
                    return Err("Invalid key type for PasswordGate".to_string());
                };
                let gate = PasswordGate::new(gate_key);
                Ok(Box::new(gate))
            }
            _ => Err("Unsupported gate type".to_string()),
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
        if let Err(e) = result {
            assert_eq!(e, "Unsupported gate type".to_string());
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
