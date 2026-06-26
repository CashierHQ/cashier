// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod email;
pub mod sms;

pub use email::OTPEmailVerifier;
pub use sms::OTPSmsVerifier;

use gate_service_types::{OtpRecord, VerificationResult};

/// Verifies a submitted OTP code against a stored record using an injected current timestamp.
/// Accepting the time as a parameter keeps this function pure and unit-testable without IC runtime.
/// # Arguments
/// * `record`: The stored OTP record containing the code and expiry.
/// * `submitted_code`: The 6-digit code provided by the claimer.
/// * `current_time_ns`: Current time in nanoseconds (pass `ic_cdk::api::time()` in production).
/// # Returns
/// * `VerificationResult::Success` if the code matches and has not expired.
/// * `VerificationResult::Failure` with a descriptive message otherwise.
pub(crate) fn verify_otp_code(
    record: &OtpRecord,
    submitted_code: &str,
    current_time_ns: u64,
) -> VerificationResult {
    if current_time_ns > record.expires_at {
        return VerificationResult::Failure(
            "OTP code has expired. Please request a new code.".to_string(),
        );
    }
    if submitted_code != record.code {
        return VerificationResult::Failure("Invalid OTP code.".to_string());
    }
    VerificationResult::Success
}

#[cfg(test)]
mod tests {
    use super::*;
    use gate_service_types::OtpRecord;

    fn fixture_of_otp_record(code: &str, expires_at: u64) -> OtpRecord {
        OtpRecord {
            code: code.to_string(),
            expires_at,
            attempts: 0,
        }
    }

    #[test]
    fn it_should_fail_verify_otp_code_due_to_expiry() {
        // Arrange
        let record = fixture_of_otp_record("123456", 500);
        let current_time_ns = 1000; // past the expiry

        // Act
        let result = verify_otp_code(&record, "123456", current_time_ns);

        // Assert
        assert!(matches!(result, VerificationResult::Failure(_)));
        if let VerificationResult::Failure(msg) = result {
            assert!(msg.contains("expired"));
        }
    }

    #[test]
    fn it_should_fail_verify_otp_code_due_to_wrong_code() {
        // Arrange
        let record = fixture_of_otp_record("123456", u64::MAX);
        let current_time_ns = 0;

        // Act
        let result = verify_otp_code(&record, "999999", current_time_ns);

        // Assert
        assert!(matches!(result, VerificationResult::Failure(_)));
        if let VerificationResult::Failure(msg) = result {
            assert!(msg.contains("Invalid"));
        }
    }

    #[test]
    fn it_should_verify_otp_code() {
        // Arrange
        let record = fixture_of_otp_record("123456", u64::MAX);
        let current_time_ns = 0;

        // Act
        let result = verify_otp_code(&record, "123456", current_time_ns);

        // Assert
        assert!(matches!(result, VerificationResult::Success));
    }
}
