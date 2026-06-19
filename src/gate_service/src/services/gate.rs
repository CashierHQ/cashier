// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gates,
    repositories::{
        Repositories,
        gate::GateRepository,
        get_password_hashing_algorithm,
        otp::{delete_otp_record, get_otp_record, set_otp_record},
    },
    services::{http::HttpOutcallService, secret::SecretService},
    utils::{
        gate::redact_password_gate,
        hashing::{hash_password, hash_password_sha256},
    },
};
use candid::Principal;
use gate_service_types::{
    Gate, GateForUser, GateKey, GateUserStatus, NewGate, OpenGateSuccessResult, OtpRecord,
    PasswordHashingAlgorithm, VerificationResult,
    constant::{BREVO_EMAIL_URL, BREVO_SMS_URL, SECRET_BREVO_API_KEY, SECRET_BREVO_EMAIL_SENDER},
    error::GateServiceError,
};
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs};
use std::rc::Rc;

/// Verifies a submitted OTP code against a stored record using an injected current timestamp.
/// Accepting the time as a parameter keeps this function pure and unit-testable without IC runtime.
/// # Arguments
/// * `record`: The stored OTP record containing the code and expiry.
/// * `submitted_code`: The 6-digit code provided by the claimer.
/// * `current_time_ns`: Current time in nanoseconds (pass `ic_cdk::api::time()` in production).
/// # Returns
/// * `VerificationResult::Success` if the code matches and has not expired.
/// * `VerificationResult::Failure` with a descriptive message otherwise.
fn verify_otp_code(
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

pub struct GateService<R: Repositories> {
    repository: GateRepository<R::Gate, R::GateUserStatus>,
}

impl<R: Repositories> GateService<R> {
    pub fn new(repositories: Rc<R>) -> Self {
        Self {
            repository: repositories.gate(),
        }
    }

    /// Create a new gate and associate it with its subject.
    /// # Arguments
    /// * `creator`: The creator of the gate.
    /// * `new_gate`: The details of the new gate to be created.
    /// # Returns
    /// * `Ok(Gate)`: If the gate is created successfully.
    /// * `Err(String)`: If there is an error during gate creation.
    pub fn add_gate(
        &mut self,
        creator: Principal,
        new_gate: NewGate,
    ) -> Result<Gate, GateServiceError> {
        let gate_key = match &new_gate.key {
            GateKey::Password(password) => {
                let hashed_password = match get_password_hashing_algorithm() {
                    PasswordHashingAlgorithm::Argon2id => {
                        hash_password(password).map_err(GateServiceError::HashingFailed)?
                    }
                    PasswordHashingAlgorithm::Sha256 => {
                        hash_password_sha256(password).map_err(GateServiceError::HashingFailed)?
                    }
                };
                GateKey::Password(hashed_password)
            }
            _ => new_gate.key.clone(),
        };

        let gate = self
            .repository
            .create_gate(
                creator,
                NewGate {
                    key: gate_key,
                    ..new_gate
                },
            )
            .map_err(GateServiceError::RepositoryError)?;

        Ok(redact_password_gate(gate))
    }

    /// Retrieves a gate by its ID
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If the gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate(&self, gate_id: &str) -> Option<Gate> {
        self.repository.get_gate(gate_id).map(redact_password_gate)
    }

    /// Retrieves a gate by its subject's ID.
    /// # Arguments
    /// * `creator`: The creator of the gate.
    /// * `subject_id`: The ID of the subject whose gate is to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If a gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_by_subject(&self, creator: Principal, subject_id: &str) -> Option<Gate> {
        self.repository
            .get_gate_by_subject(creator, subject_id)
            .map(redact_password_gate)
    }

    /// Retrieves the user status of a gate for a specific user.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// * `user`: The user for whom the gate status is to be checked.
    /// # Returns
    /// * `Ok(Some(GateUserStatus))`: If the gate user status is found.
    /// * `Ok(None)`: If no gate user status is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_user_status(&self, gate_id: &str, user: Principal) -> Option<GateUserStatus> {
        self.repository.get_gate_user_status(gate_id, user)
    }

    /// Retrieves a gate with its status for a specific user.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// * `user`: The user for whom the gate status is to be checked.
    /// # Returns
    /// * `Ok(GateForUser)`: If the gate and user status are found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_for_user(
        &self,
        gate_id: &str,
        user: Principal,
    ) -> Result<GateForUser, GateServiceError> {
        let gate = self.get_gate(gate_id).ok_or(GateServiceError::NotFound)?;
        let gate_user_status = self.get_gate_user_status(gate_id, user);
        Ok(GateForUser {
            gate,
            gate_user_status,
        })
    }

    /// Generates a 6-digit OTP code, stores it, and sends it to the configured destination via Brevo.
    /// Overwrites any previously issued code for this gate/user pair.
    /// # Arguments
    /// * `gate_id`: The ID of an OTPEmail or OTPSms gate.
    /// * `user`: The principal of the claimer requesting the code.
    /// * `http`: HTTP outcall service for the Brevo API request.
    /// * `secrets`: Secret service for `brevo_api_key` and (for email) `brevo_email_sender`.
    /// # Returns
    /// * `Ok(())`: Code generated, stored, and dispatched.
    /// * `Err(GateServiceError::NotFound)`: Gate does not exist.
    /// * `Err(GateServiceError::UnsupportedGateKey)`: Gate is not an OTP type.
    /// * `Err(GateServiceError::KeyVerificationFailed)`: Brevo API call failed.
    pub async fn send_otp<H: HttpOutcallService, S: SecretService>(
        &self,
        gate_id: &str,
        user: Principal,
        http: &H,
        secrets: &S,
    ) -> Result<(), GateServiceError> {
        let gate = self
            .repository
            .get_gate(gate_id)
            .ok_or(GateServiceError::NotFound)?;

        let destination = match &gate.key {
            GateKey::OTPEmail(email) => email.clone(),
            GateKey::OTPSms(phone) => phone.clone(),
            _ => {
                return Err(GateServiceError::UnsupportedGateKey(format!(
                    "{:?}",
                    gate.key
                )));
            }
        };

        let rand_bytes = ic_cdk::management_canister::raw_rand()
            .await
            .map_err(|e| GateServiceError::KeyVerificationFailed(format!("raw_rand: {e:?}")))?;
        let rand_u32 =
            u32::from_le_bytes([rand_bytes[0], rand_bytes[1], rand_bytes[2], rand_bytes[3]]);
        let code = format!("{:06}", rand_u32 % 1_000_000);

        const OTP_TTL_NS: u64 = 600_000_000_000; // 10 minutes in nanoseconds
        let expires_at = ic_cdk::api::time() + OTP_TTL_NS;

        set_otp_record(
            gate_id,
            user,
            OtpRecord {
                code: code.clone(),
                expires_at,
                attempts: 0,
            },
        );

        let api_key = secrets.get_secret(SECRET_BREVO_API_KEY).await?;

        let (url, body) = match &gate.key {
            GateKey::OTPEmail(_) => {
                let sender_email = secrets.get_secret(SECRET_BREVO_EMAIL_SENDER).await?;
                let body = serde_json::json!({
                    "sender": {"name": "Cashier", "email": sender_email},
                    "to": [{"email": destination, "name": destination}],
                    "subject": "Your Cashier OTP Code",
                    "htmlContent": format!(
                        "<html><body><p>Your OTP code is: <b>{}</b>. It expires in 10 minutes.</p></body></html>",
                        code
                    )
                })
                .to_string()
                .into_bytes();
                (BREVO_EMAIL_URL.to_string(), body)
            }
            GateKey::OTPSms(_) => {
                let body = serde_json::json!({
                    "sender": "Cashier",
                    "recipient": destination,
                    "content": format!("Your Cashier OTP code is: {}. Valid for 10 minutes.", code),
                    "type": "transactional"
                })
                .to_string()
                .into_bytes();
                (BREVO_SMS_URL.to_string(), body)
            }
            _ => unreachable!(),
        };

        let args = HttpRequestArgs {
            url,
            max_response_bytes: Some(2048),
            method: HttpMethod::POST,
            headers: vec![
                HttpHeader {
                    name: "accept".to_string(),
                    value: "application/json".to_string(),
                },
                HttpHeader {
                    name: "content-type".to_string(),
                    value: "application/json".to_string(),
                },
                HttpHeader {
                    name: "api-key".to_string(),
                    value: api_key,
                },
            ],
            body: Some(body),
            transform: None,
            is_replicated: Some(false),
        };

        let response = http.execute(args).await?;

        // Brevo returns 201 for email success, 200 for SMS success
        if response.status != 200u32 && response.status != 201u32 {
            let body_str = String::from_utf8_lossy(&response.body).to_string();
            return Err(GateServiceError::KeyVerificationFailed(format!(
                "Brevo API returned status {}: {}",
                response.status, body_str
            )));
        }

        Ok(())
    }

    /// Opens a gate for caller if the provided key is valid.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be opened.
    /// * `key`: The key to be used for opening the gate.
    /// * `user`: The user who is opening the gate.
    /// * `http`: HTTP outcall service used by verifiers that make external API calls.
    /// * `secrets`: Secret service used by verifiers that need stored credentials.
    /// # Returns
    /// * `Ok(OpenGateSuccessResult)`: If the gate is opened successfully.
    /// * `Err(GateServiceError)`: If there is an error during gate opening.
    pub async fn open_gate<H: HttpOutcallService, S: SecretService>(
        &mut self,
        gate_id: &str,
        key: GateKey,
        user: Principal,
        http: &H,
        secrets: &S,
    ) -> Result<OpenGateSuccessResult, GateServiceError> {
        let gate = self
            .repository
            .get_gate(gate_id)
            .ok_or(GateServiceError::NotFound)?;

        // OTP gates verify against the stored OTP record instead of going through verify_gate.
        if matches!(gate.key, GateKey::OTPEmail(_) | GateKey::OTPSms(_)) {
            let submitted_code = match key {
                GateKey::OTPEmail(code) | GateKey::OTPSms(code) => code,
                _ => {
                    return Err(GateServiceError::InvalidKeyType(
                        "Expected OTPEmail or OTPSms credential for OTP gate".to_string(),
                    ));
                }
            };

            let record = get_otp_record(gate_id, user).ok_or_else(|| {
                GateServiceError::KeyVerificationFailed(
                    "No OTP code found. Please request a new code.".to_string(),
                )
            })?;

            let current_time = ic_cdk::api::time();
            match verify_otp_code(&record, &submitted_code, current_time) {
                VerificationResult::Success => {
                    delete_otp_record(gate_id, user);
                    let redacted = redact_password_gate(gate);
                    let (gate, gate_user_status) = self
                        .repository
                        .open_gate(redacted, user)
                        .map_err(GateServiceError::RepositoryError)?;
                    return Ok(OpenGateSuccessResult {
                        gate,
                        gate_user_status,
                    });
                }
                VerificationResult::Failure(e) => {
                    let mut updated_record = record;
                    updated_record.attempts += 1;
                    set_otp_record(gate_id, user, updated_record);
                    return Err(GateServiceError::KeyVerificationFailed(e));
                }
            }
        }

        let gate_config_key = gate.key.clone();

        match gates::verify_gate(gate_config_key, key, http, secrets).await? {
            VerificationResult::Success => {
                let redacted = redact_password_gate(gate);
                let (gate, gate_user_status) = self
                    .repository
                    .open_gate(redacted, user)
                    .map_err(GateServiceError::RepositoryError)?;

                Ok(OpenGateSuccessResult {
                    gate,
                    gate_user_status,
                })
            }
            VerificationResult::Failure(e) => Err(GateServiceError::KeyVerificationFailed(e)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::GateStatus;
    use std::collections::HashMap;

    fn fixture_of_services() -> (MockHttpOutcallService, MockSecretService) {
        (
            MockHttpOutcallService::new(vec![]),
            MockSecretService::new(HashMap::new()),
        )
    }

    /// Generate a fixture for the gate service using a stable gate repository.
    fn gate_service_fixture() -> GateService<TestRepositories> {
        GateService::new(Rc::new(TestRepositories::new()))
    }

    #[test]
    fn it_should_add_gate() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let gates = vec![
            NewGate {
                subject_id: "subject1".to_string(),
                key: GateKey::Password("password123".to_string()),
            },
            NewGate {
                subject_id: "subject2".to_string(),
                key: GateKey::XFollowing("x_handle".to_string()),
            },
            NewGate {
                subject_id: "subject3".to_string(),
                key: GateKey::TelegramGroup("telegram_group_id".to_string()),
            },
            NewGate {
                subject_id: "subject4".to_string(),
                key: GateKey::DiscordServer("discord_server_id".to_string()),
            },
            NewGate {
                subject_id: "subject5".to_string(),
                key: GateKey::OTPEmail("user@example.com".to_string()),
            },
            NewGate {
                subject_id: "subject6".to_string(),
                key: GateKey::OTPSms("+1234567890".to_string()),
            },
        ];

        for gate in gates {
            // Act
            let created_gate = service.add_gate(creator, gate.clone()).unwrap();

            // Assert
            assert!(!created_gate.id.is_empty());
            assert_eq!(created_gate.creator, creator);
            assert_eq!(created_gate.subject_id, gate.subject_id);
            if let GateKey::Password(_) = gate.key {
                assert_eq!(created_gate.key, GateKey::PasswordRedacted);
            } else {
                assert_eq!(created_gate.key, gate.key);
            }
        }
    }

    #[test]
    fn it_should_none_get_gate() {
        // Arrange
        let service = gate_service_fixture();

        // Act
        let gate = service.get_gate("non_existent_gate_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_password_gate() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate(&gate.id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, "subject1".to_string());
        assert_eq!(gate.key, GateKey::PasswordRedacted);
    }

    #[test]
    fn it_should_get_xfollowing_gate() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate(&gate.id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::XFollowing("x_handle".to_string()));
    }

    #[test]
    fn it_should_none_get_gate_by_subject_id() {
        // Arrange
        let service = gate_service_fixture();
        let creator = random_principal_id();

        // Act
        let gate = service.get_gate_by_subject(creator, "non_existent_subject_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_password_gate_by_subject_id() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            key: GateKey::Password("password123".to_string()),
        };
        service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate_by_subject(creator, &subject_id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::PasswordRedacted);
    }

    #[test]
    fn it_should_get_xfollowing_gate_by_subject_id() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate_by_subject(creator, &subject_id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::XFollowing("x_handle".to_string()));
    }

    #[tokio::test]
    async fn it_should_open_password_gate() {
        // Arrange
        let mut service = gate_service_fixture();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();
        let gate_key = GateKey::Password("password123".to_string());
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(&gate.id, gate_key, user, &http, &secrets)
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate.id, gate.id);
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
        assert_eq!(result.gate_user_status.user_id, user);
    }

    #[test]
    fn it_should_none_get_gate_user_status() {
        // Arrange
        let service = gate_service_fixture();
        let user = random_principal_id();

        // Act
        let result = service.get_gate_user_status("non_existent_gate_id", user);

        // Assert
        assert!(result.is_none());
    }

    // ── verify_otp_code ───────────────────────────────────────────────────────

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

    #[tokio::test]
    async fn it_should_get_password_gate_for_user() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();
        let gate_key = GateKey::Password("password123".to_string());
        let user = random_principal_id();
        let (http, secrets) = fixture_of_services();
        let _ = service
            .open_gate(&gate.id, gate_key, user, &http, &secrets)
            .await;

        // Act
        let result = service.get_gate_for_user(&gate.id, user);

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate.id, gate.id);
        assert!(result.gate_user_status.is_some());
        let gate_user_status = result.gate_user_status.unwrap();
        assert_eq!(gate_user_status.gate_id, gate.id);
        assert_eq!(gate_user_status.user_id, user);
        assert_eq!(gate_user_status.status, GateStatus::Open);
    }
}
