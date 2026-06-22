// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gates::{GateVerifier, otp::verify_otp_code},
    repositories::otp::{delete_otp_record, get_otp_record, set_otp_record},
    services::{http::HttpOutcallService, secret::SecretService},
};
use candid::Principal;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use std::fmt::Debug;

/// Verifier for the OTP-SMS gate.
/// Validates that the caller supplies the 6-digit code that was previously sent to the
/// configured phone number via `send_otp`. Manages attempt tracking and record cleanup.
pub struct OTPSmsVerifier {
    gate_id: String,
    user: Principal,
}

impl OTPSmsVerifier {
    /// Creates a new verifier for the given gate and user.
    /// # Arguments
    /// * `gate_id`: The ID of the OTPSms gate being opened.
    /// * `user`: The principal of the claimer whose OTP record to look up.
    pub fn new(gate_id: String, user: Principal) -> Self {
        Self { gate_id, user }
    }

    /// Inner verification with an injected current timestamp for testability.
    pub(crate) async fn verify_with_time<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        _http: &H,
        _secrets: &S,
        current_time: u64,
    ) -> Result<VerificationResult, GateServiceError> {
        let submitted_code = match key {
            GateKey::OTPSms(code) => code,
            _ => {
                return Err(GateServiceError::InvalidKeyType(
                    "OTPSmsVerifier".to_string(),
                ));
            }
        };

        let record = get_otp_record(&self.gate_id, self.user).ok_or_else(|| {
            GateServiceError::KeyVerificationFailed(
                "No OTP code found. Please request a new code.".to_string(),
            )
        })?;

        match verify_otp_code(&record, &submitted_code, current_time) {
            VerificationResult::Success => {
                delete_otp_record(&self.gate_id, self.user);
                Ok(VerificationResult::Success)
            }
            VerificationResult::Failure(e) => {
                let mut updated_record = record;
                updated_record.attempts += 1;
                set_otp_record(&self.gate_id, self.user, updated_record);
                Ok(VerificationResult::Failure(e))
            }
        }
    }
}

impl GateVerifier for OTPSmsVerifier {
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        http: &H,
        secrets: &S,
    ) -> Result<VerificationResult, GateServiceError> {
        self.verify_with_time(key, http, secrets, ic_cdk::api::time())
            .await
    }
}

impl Debug for OTPSmsVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "OTPSmsVerifier(gate_id={})", self.gate_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::otp::set_otp_record;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use cashier_common::test_utils::random_principal_id;
    use gate_service_types::OtpRecord;
    use std::collections::HashMap;

    fn fixture_of_services() -> (MockHttpOutcallService, MockSecretService) {
        (
            MockHttpOutcallService::new(vec![]),
            MockSecretService::new(HashMap::new()),
        )
    }

    fn fixture_of_otp_record(code: &str, expires_at: u64) -> OtpRecord {
        OtpRecord {
            code: code.to_string(),
            expires_at,
            attempts: 0,
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_sms_otp_due_to_invalid_key_type() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_sms_key_type".to_string();
        let user = random_principal_id();
        let verifier = OTPSmsVerifier::new(gate_id, user);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPEmail("123456".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
        if let Err(GateServiceError::InvalidKeyType(msg)) = result {
            assert!(msg.contains("OTPSmsVerifier"));
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_sms_otp_due_to_no_otp_record() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_sms_no_record".to_string();
        let user = random_principal_id();
        let verifier = OTPSmsVerifier::new(gate_id, user);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPSms("123456".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(msg.contains("No OTP code found"));
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_sms_otp_due_to_expired_code() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_sms_expired".to_string();
        let user = random_principal_id();
        set_otp_record(&gate_id, user, fixture_of_otp_record("123456", 500));
        let verifier = OTPSmsVerifier::new(gate_id, user);

        // Act
        let result = verifier
            .verify_with_time(
                GateKey::OTPSms("123456".to_string()),
                &http,
                &secrets,
                1000, // past expiry
            )
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Failure(_))));
        if let Ok(VerificationResult::Failure(msg)) = result {
            assert!(msg.contains("expired"));
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_sms_otp_due_to_wrong_code() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_sms_wrong_code".to_string();
        let user = random_principal_id();
        set_otp_record(&gate_id, user, fixture_of_otp_record("123456", u64::MAX));
        let verifier = OTPSmsVerifier::new(gate_id, user);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPSms("999999".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Failure(_))));
        if let Ok(VerificationResult::Failure(msg)) = result {
            assert!(msg.contains("Invalid OTP code"));
        }
    }

    #[tokio::test]
    async fn it_should_verify_sms_otp() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_success_sms".to_string();
        let user = random_principal_id();
        set_otp_record(&gate_id, user, fixture_of_otp_record("123456", u64::MAX));
        let verifier = OTPSmsVerifier::new(gate_id, user);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPSms("123456".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_increment_attempts_on_wrong_sms_otp() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_attempts_sms".to_string();
        let user = random_principal_id();
        set_otp_record(&gate_id, user, fixture_of_otp_record("123456", u64::MAX));
        let verifier = OTPSmsVerifier::new(gate_id.clone(), user);

        // Act
        let _ = verifier
            .verify_with_time(GateKey::OTPSms("999999".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        let record = get_otp_record(&gate_id, user).expect("record should still exist");
        assert_eq!(record.attempts, 1);
    }
}
