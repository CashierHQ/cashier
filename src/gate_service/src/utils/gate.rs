use gate_service_types::{Gate, GateKey, GateType};

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
