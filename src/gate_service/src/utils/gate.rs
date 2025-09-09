use candid::Principal;
use gate_service_types::{Gate, GateKey};

/// Redacts the password field from a gate.
/// # Arguments
/// * `gate`: The gate to redact the password from.
/// # Returns
/// The gate with the password redacted.
pub fn redact_password_gate(gate: Gate) -> Gate {
    match gate.key {
        GateKey::Password(_) => Gate {
            key: GateKey::PasswordRedacted,
            ..gate
        },
        _ => gate,
    }
}

/// Generates a unique gate ID based on the creator's principal and subject ID.
/// # Arguments
/// * `creator`: The creator of the gate.
/// * `subject_id`: The ID of the subject being gated.
/// # Returns
/// A unique gate ID.
pub fn generate_gate_id(creator: Principal, subject_id: &str) -> String {
    format!("{}_{}", creator, subject_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;
    use gate_service_types::{Gate, GateKey};

    #[test]
    fn it_should_redact_password_gate() {
        // Arrange
        let gate = Gate {
            id: "test_gate_id".into(),
            creator: random_principal_id(),
            subject_id: "test_subject".into(),
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
        assert_eq!(gate_id, format!("{}_{}", creator, subject_id));
    }
}
