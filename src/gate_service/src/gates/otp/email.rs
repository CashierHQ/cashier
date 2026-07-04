// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gates::otp::verify_otp_code,
    repositories::otp::{OtpRepository, OtpStorage},
    services::{http::HttpOutcallService, secret::SecretService},
};
use candid::Principal;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use ic_mple_log::service::Storage;
use std::fmt::Debug;

/// Verifier for the OTP-email gate.
/// Validates that the caller supplies the 6-digit code that was previously sent to the
/// configured email address via `send_otp`. Manages attempt tracking and record cleanup.
pub struct OTPEmailVerifier<'a, O: Storage<OtpStorage>> {
    gate_id: String,
    user: Principal,
    otp_repo: &'a mut OtpRepository<O>,
}

impl<'a, O: Storage<OtpStorage>> OTPEmailVerifier<'a, O> {
    /// Creates a new verifier for the given gate and user.
    /// # Arguments
    /// * `gate_id`: The ID of the OTPEmail gate being opened.
    /// * `user`: The principal of the claimer whose OTP record to look up.
    /// * `otp_repo`: Repository containing pending OTP records.
    pub fn new(gate_id: String, user: Principal, otp_repo: &'a mut OtpRepository<O>) -> Self {
        Self {
            gate_id,
            user,
            otp_repo,
        }
    }

    /// Inner verification with an injected current timestamp for testability.
    /// # Arguments
    /// * `key`: The gate key containing the submitted OTP code.
    /// * `http`: HTTP service (not used for OTPEmail but required by trait).
    /// * `secrets`: Secret service (not used for OTPEmail but required by trait
    /// * `current_time`: Current timestamp in seconds since the epoch, used to check OTP expiry.
    /// # Returns
    /// * `Ok(VerificationResult::Success)`: The submitted code matches the stored OTP and is not expired.
    /// * `Ok(VerificationResult::Failure(msg))`: The code is incorrect or expired, with an explanatory message.
    /// * `Err(GateServiceError)`: The key type is invalid or no OTP record exists for the user.
    pub(crate) async fn verify_with_time<H: HttpOutcallService, S: SecretService>(
        &mut self,
        key: GateKey,
        _http: &H,
        _secrets: &S,
        current_time: u64,
    ) -> Result<VerificationResult, GateServiceError> {
        let submitted_code = match key {
            GateKey::OTPEmail(code) => code,
            _ => {
                return Err(GateServiceError::InvalidKeyType(
                    "OTPEmailVerifier".to_string(),
                ));
            }
        };

        let record = self
            .otp_repo
            .get_otp_record(&self.gate_id, self.user)
            .ok_or_else(|| {
                GateServiceError::KeyVerificationFailed(
                    "No OTP code found. Please request a new code.".to_string(),
                )
            })?;

        match verify_otp_code(&record, &submitted_code, current_time) {
            VerificationResult::Success => {
                self.otp_repo.delete_otp_record(&self.gate_id, self.user);
                Ok(VerificationResult::Success)
            }
            VerificationResult::Failure(e) => {
                let mut updated_record = record;
                updated_record.attempts += 1;
                self.otp_repo
                    .set_otp_record(&self.gate_id, self.user, updated_record);
                Ok(VerificationResult::Failure(e))
            }
        }
    }
}

impl<O: Storage<OtpStorage>> Debug for OTPEmailVerifier<'_, O> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "OTPEmailVerifier(gate_id={})", self.gate_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
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

    fn seed_otp_record<O: Storage<OtpStorage>>(
        otp_repo: &mut OtpRepository<O>,
        gate_id: &str,
        user: Principal,
        record: OtpRecord,
    ) {
        otp_repo.set_otp_record(gate_id, user, record);
    }

    fn read_otp_record<O: Storage<OtpStorage>>(
        otp_repo: &OtpRepository<O>,
        gate_id: &str,
        user: Principal,
    ) -> Option<OtpRecord> {
        otp_repo.get_otp_record(gate_id, user)
    }

    #[tokio::test]
    async fn it_should_fail_verify_email_otp_due_to_invalid_key_type() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate1".to_string();
        let user = random_principal_id();
        let repositories = TestRepositories::new();
        let mut otp_repo = repositories.otp();
        let mut verifier = OTPEmailVerifier::new(gate_id, user, &mut otp_repo);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPSms("123456".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
        if let Err(GateServiceError::InvalidKeyType(msg)) = result {
            assert!(msg.contains("OTPEmailVerifier"));
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_email_otp_due_to_no_otp_record() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_no_record".to_string();
        let user = random_principal_id();
        let repositories = TestRepositories::new();
        let mut otp_repo = repositories.otp();
        let mut verifier = OTPEmailVerifier::new(gate_id, user, &mut otp_repo);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPEmail("123456".to_string()), &http, &secrets, 0)
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
    async fn it_should_fail_verify_email_otp_due_to_expired_code() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_expired".to_string();
        let user = random_principal_id();
        let repositories = TestRepositories::new();
        let mut otp_repo = repositories.otp();
        seed_otp_record(
            &mut otp_repo,
            &gate_id,
            user,
            fixture_of_otp_record("123456", 500),
        );
        let mut verifier = OTPEmailVerifier::new(gate_id, user, &mut otp_repo);

        // Act
        let result = verifier
            .verify_with_time(
                GateKey::OTPEmail("123456".to_string()),
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
    async fn it_should_fail_verify_email_otp_due_to_wrong_code() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_wrong_code".to_string();
        let user = random_principal_id();
        let repositories = TestRepositories::new();
        let mut otp_repo = repositories.otp();
        seed_otp_record(
            &mut otp_repo,
            &gate_id,
            user,
            fixture_of_otp_record("123456", u64::MAX),
        );
        let mut verifier = OTPEmailVerifier::new(gate_id, user, &mut otp_repo);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPEmail("999999".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Failure(_))));
        if let Ok(VerificationResult::Failure(msg)) = result {
            assert!(msg.contains("Invalid OTP code"));
        }
    }

    #[tokio::test]
    async fn it_should_verify_email_otp() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_success_email".to_string();
        let user = random_principal_id();
        let repositories = TestRepositories::new();
        let mut otp_repo = repositories.otp();
        seed_otp_record(
            &mut otp_repo,
            &gate_id,
            user,
            fixture_of_otp_record("123456", u64::MAX),
        );
        let mut verifier = OTPEmailVerifier::new(gate_id, user, &mut otp_repo);

        // Act
        let result = verifier
            .verify_with_time(GateKey::OTPEmail("123456".to_string()), &http, &secrets, 0)
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_increment_attempts_on_wrong_email_otp() {
        // Arrange
        let (http, secrets) = fixture_of_services();
        let gate_id = "gate_attempts_email".to_string();
        let user = random_principal_id();
        let repositories = TestRepositories::new();
        let mut otp_repo = repositories.otp();
        seed_otp_record(
            &mut otp_repo,
            &gate_id,
            user,
            fixture_of_otp_record("123456", u64::MAX),
        );
        let mut verifier = OTPEmailVerifier::new(gate_id.clone(), user, &mut otp_repo);

        // Act
        let _ = verifier
            .verify_with_time(GateKey::OTPEmail("999999".to_string()), &http, &secrets, 0)
            .await;
        drop(verifier);

        // Assert
        let record = read_otp_record(&otp_repo, &gate_id, user).expect("record should still exist");
        assert_eq!(record.attempts, 1);
    }
}
