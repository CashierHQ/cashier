use candid::Principal;
use gate_service_types::{Gate, GateKey, GateType};
use uuid::Uuid;

/// Redacts the password field from a gate.
/// # Arguments
/// * `gate`: The gate to redact the password from.
/// # Returns
/// The gate with the password redacted.
pub fn redact_password_gate(gate: Gate) -> Gate {
    match gate.gate_type {
        GateType::Password => Gate {
            key: GateKey::PasswordRedacted,
            ..gate
        },
        _ => gate,
    }
}

/// Generates a unique gate ID based on the creator's principal, subject ID, and a UUID.
/// # Arguments
/// * `creator`: The principal of the creator.
/// * `subject_id`: The ID of the subject being gated.
/// # Returns
/// A unique gate ID.
pub fn generate_gate_id(creator: Principal, subject_id: &str) -> String {
    format!("{}_{}_{}", creator, subject_id, Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;
    use gate_service_types::{Gate, GateKey, GateType};

    #[test]
    fn it_should_redact_password_gate() {
        // Arrange
        let gate = Gate {
            id: "test_gate_id".into(),
            subject_id: "test_subject".into(),
            gate_type: GateType::Password,
            key: GateKey::Password("test_password".into()),
        };

        // Act
        let redacted_gate = redact_password_gate(gate);

        // Assert
        assert_eq!(redacted_gate.key, GateKey::PasswordRedacted);
    }

    #[test]
    fn it_should_generate_gate_id() {
        // Arrange
        let creator = Principal::anonymous();
        let subject_id = "test_subject";

        // Act
        let gate_id = generate_gate_id(creator, subject_id);

        // Assert
        assert!(gate_id.starts_with(&format!("{}_{}", creator, subject_id)));
        assert!(gate_id.len() > format!("{}_{}", creator, subject_id).len());
    }
}
