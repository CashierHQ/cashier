// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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

/// Generates a unique gate ID based on the creator's principal, subject ID, and key type.
/// # Arguments
/// * `creator`: The creator of the gate.
/// * `subject_id`: The ID of the subject being gated.
/// * `key`: The gate key, used to differentiate multiple gates on the same subject.
/// # Returns
/// A unique gate ID.
pub fn generate_gate_id(creator: Principal, subject_id: &str, key: &GateKey) -> String {
    format!("{}_{}_{}", creator, subject_id, key)
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
        let key = GateKey::Password("secret".to_string());

        // Act
        let gate_id = generate_gate_id(creator, subject_id, &key);

        // Assert
        assert_eq!(
            gate_id,
            format!("{}_{}_{}", creator, subject_id, "password")
        );
    }

    #[test]
    fn it_should_display_gate_key() {
        assert_eq!(GateKey::Password("x".into()).to_string(), "password");
        assert_eq!(GateKey::PasswordRedacted.to_string(), "password");
        assert_eq!(GateKey::XFollowing("x".into()).to_string(), "xfollowing");
        assert_eq!(
            GateKey::XOwnedAccount("x".into()).to_string(),
            "xownedaccount"
        );
        assert_eq!(GateKey::XLikedPost("x".into()).to_string(), "xlikedpost");
        assert_eq!(
            GateKey::XLikedPostCredential {
                user_id: "u".into(),
                access_token: "t".into()
            }
            .to_string(),
            "xlikedpost"
        );
        assert_eq!(
            GateKey::XRetweetedPost("x".into()).to_string(),
            "xretweetedpost"
        );
        assert_eq!(
            GateKey::XRetweetedPostCredential {
                user_id: "u".into()
            }
            .to_string(),
            "xretweetedpost"
        );
        assert_eq!(
            GateKey::TelegramGroup("x".into()).to_string(),
            "telegramgroup"
        );
        assert_eq!(
            GateKey::DiscordServer("x".into()).to_string(),
            "discordserver"
        );
        assert_eq!(GateKey::OTPEmail("x".into()).to_string(), "otpemail");
        assert_eq!(GateKey::OTPSms("x".into()).to_string(), "otpsms");
    }
}
