// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gates,
    repositories::{
        Repositories, gate::GateRepository, otp::OtpRepository,
        password_hashing_algorithm::PasswordHashingAlgorithmRepository,
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

pub struct GateService<R: Repositories> {
    gate_repo: GateRepository<R::Gate, R::GateUserStatus>,
    otp_repo: OtpRepository<R::Otp>,
    password_hashing_algorithm_repo:
        PasswordHashingAlgorithmRepository<R::PasswordHashingAlgorithm>,
}

impl<R: Repositories> GateService<R> {
    pub fn new(repositories: Rc<R>) -> Self {
        Self {
            gate_repo: repositories.gate(),
            otp_repo: repositories.otp(),
            password_hashing_algorithm_repo: repositories.password_hashing_algorithm(),
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
                let hashed_password = match self.password_hashing_algorithm_repo.get() {
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
            .gate_repo
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
        self.gate_repo.get_gate(gate_id).map(redact_password_gate)
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
        self.gate_repo.get_gate_user_status(gate_id, user)
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

    /// Stores the given OTP code and sends it to the configured destination via Brevo.
    /// Overwrites any previously issued code for this gate/user pair.
    /// The caller is responsible for generating `code` and computing `expires_at`.
    /// # Arguments
    /// * `gate_id`: The ID of an OTPEmail or OTPSms gate.
    /// * `user`: The principal of the claimer requesting the code.
    /// * `http`: HTTP outcall service for the Brevo API request.
    /// * `secrets`: Secret service for `brevo_api_key` and (for email) `brevo_email_sender`.
    /// * `code`: The 6-digit OTP code to store and send.
    /// * `expires_at`: Absolute expiry timestamp in nanoseconds.
    /// # Returns
    /// * `Ok(())`: Code stored and dispatched.
    /// * `Err(GateServiceError::NotFound)`: Gate does not exist.
    /// * `Err(GateServiceError::UnsupportedGateKey)`: Gate is not an OTP type.
    /// * `Err(GateServiceError::KeyVerificationFailed)`: Brevo API call failed.
    pub async fn send_otp<H: HttpOutcallService, S: SecretService>(
        &mut self,
        gate_id: &str,
        user: Principal,
        http: &H,
        secrets: &S,
        code: &str,
        expires_at: u64,
    ) -> Result<(), GateServiceError> {
        let gate = self
            .gate_repo
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

        self.otp_repo.set_otp_record(
            gate_id,
            user,
            OtpRecord {
                code: code.to_string(),
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
    /// * `current_time`: Current IC time in nanoseconds (supplied by the caller so tests can inject a fixed value).
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
        current_time: u64,
    ) -> Result<OpenGateSuccessResult, GateServiceError> {
        let gate = self
            .gate_repo
            .get_gate(gate_id)
            .ok_or(GateServiceError::NotFound)?;

        let gate_config_key = gate.key.clone();

        match gates::verify_gate(
            gate_config_key,
            key,
            http,
            secrets,
            gates::GateVerificationContext {
                gate_id,
                user,
                current_time,
                otp_repo: &mut self.otp_repo,
            },
        )
        .await?
        {
            VerificationResult::Success => {
                let redacted = redact_password_gate(gate);
                let (gate, gate_user_status) = self
                    .gate_repo
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
    use crate::repositories::Repositories;
    use crate::repositories::tests::TestRepositories;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::{
        GateStatus,
        constant::{SECRET_TWITTER_API_KEY, SECRET_X_BEARER_TOKEN},
    };
    use std::collections::HashMap;

    fn fixture_of_services() -> (MockHttpOutcallService, MockSecretService) {
        (
            MockHttpOutcallService::new(vec![]),
            MockSecretService::new(HashMap::new()),
        )
    }

    /// Generate a fixture for the gate service and its backing repositories.
    /// The returned `Rc<TestRepositories>` can be used to inspect repository state after service calls.
    fn fixture_of_gate_service() -> (GateService<TestRepositories>, Rc<TestRepositories>) {
        let repos = Rc::new(TestRepositories::new());
        (GateService::new(repos.clone()), repos)
    }

    fn seed_otp_record(
        repositories: &TestRepositories,
        gate_id: &str,
        user: Principal,
        record: OtpRecord,
    ) {
        repositories.otp().set_otp_record(gate_id, user, record);
    }

    #[test]
    fn it_should_add_gate() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
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
        let (service, _repos) = fixture_of_gate_service();

        // Act
        let gate = service.get_gate("non_existent_gate_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_password_gate() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
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
        let (mut service, _repos) = fixture_of_gate_service();
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

    #[tokio::test]
    async fn it_should_open_password_gate() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
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
            .open_gate(&gate.id, gate_key, user, &http, &secrets, 0)
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
        let (service, _repos) = fixture_of_gate_service();
        let user = random_principal_id();

        // Act
        let result = service.get_gate_user_status("non_existent_gate_id", user);

        // Assert
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn it_should_get_password_gate_for_user() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
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
            .open_gate(&gate.id, gate_key, user, &http, &secrets, 0)
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

    // ── send_otp failure cases ─────────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_fail_send_otp_due_to_gate_not_found() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(
                "nonexistent_gate",
                user,
                &http,
                &secrets,
                "123456",
                u64::MAX,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::NotFound)));
    }

    #[tokio::test]
    async fn it_should_fail_send_otp_due_to_unsupported_gate_key() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::Password("pass".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::UnsupportedGateKey(_))
        ));
    }

    #[tokio::test]
    async fn it_should_fail_send_otp_email_due_to_missing_brevo_api_key() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::new(HashMap::new());
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPEmail("test@example.com".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains(SECRET_BREVO_API_KEY),
                "Expected error containing '{}', got: {}",
                SECRET_BREVO_API_KEY,
                msg
            );
        }
    }

    #[tokio::test]
    async fn it_should_fail_send_otp_email_due_to_missing_sender_secret() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::with_entry(SECRET_BREVO_API_KEY, "test_api_key");
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPEmail("test@example.com".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains(SECRET_BREVO_EMAIL_SENDER),
                "Expected error containing '{}', got: {}",
                SECRET_BREVO_EMAIL_SENDER,
                msg
            );
        }
    }

    #[tokio::test]
    async fn it_should_fail_send_otp_email_due_to_brevo_api_error() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http =
            MockHttpOutcallService::with_json_response(400, r#"{"code":"invalid_parameter"}"#);
        let mut secret_map = HashMap::new();
        secret_map.insert(SECRET_BREVO_API_KEY.to_string(), "test_api_key".to_string());
        secret_map.insert(
            SECRET_BREVO_EMAIL_SENDER.to_string(),
            "sender@example.com".to_string(),
        );
        let secrets = MockSecretService::new(secret_map);
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPEmail("test@example.com".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains("400"),
                "Expected error containing '400', got: {}",
                msg
            );
        }
    }

    #[tokio::test]
    async fn it_should_fail_send_otp_sms_due_to_missing_brevo_api_key() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::new(HashMap::new());
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPSms("+1234567890".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains(SECRET_BREVO_API_KEY),
                "Expected error containing '{}', got: {}",
                SECRET_BREVO_API_KEY,
                msg
            );
        }
    }

    #[tokio::test]
    async fn it_should_fail_send_otp_sms_due_to_brevo_api_error() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http =
            MockHttpOutcallService::with_json_response(400, r#"{"code":"invalid_parameter"}"#);
        let secrets = MockSecretService::with_entry(SECRET_BREVO_API_KEY, "test_api_key");
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPSms("+1234567890".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains("400"),
                "Expected error containing '400', got: {}",
                msg
            );
        }
    }

    // ── send_otp success cases ─────────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_send_otp_email_successfully() {
        // Arrange
        let (mut service, repos) = fixture_of_gate_service();
        let http =
            MockHttpOutcallService::with_json_response(201, r#"{"messageId":"<abc@brevo>"}"#);
        let mut secret_map = HashMap::new();
        secret_map.insert(SECRET_BREVO_API_KEY.to_string(), "test_api_key".to_string());
        secret_map.insert(
            SECRET_BREVO_EMAIL_SENDER.to_string(),
            "sender@example.com".to_string(),
        );
        let secrets = MockSecretService::new(secret_map);
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPEmail("test@example.com".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(result.is_ok());
        let record = repos
            .otp()
            .get_otp_record(&gate.id, user)
            .expect("OTP record should have been stored");
        assert_eq!(record.code, "123456");
        assert_eq!(record.attempts, 0);
    }

    #[tokio::test]
    async fn it_should_send_otp_sms_successfully() {
        // Arrange
        let (mut service, repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::with_json_response(200, r#"{"messageId":"sms-123"}"#);
        let secrets = MockSecretService::with_entry(SECRET_BREVO_API_KEY, "test_api_key");
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPSms("+1234567890".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .send_otp(&gate.id, user, &http, &secrets, "123456", u64::MAX)
            .await;

        // Assert
        assert!(result.is_ok());
        let record = repos
            .otp()
            .get_otp_record(&gate.id, user)
            .expect("OTP record should have been stored");
        assert_eq!(record.code, "123456");
    }

    // ── open_gate failure cases ────────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_fail_open_gate_due_to_gate_not_found() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                "nonexistent",
                GateKey::Password("x".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::NotFound)));
    }

    #[tokio::test]
    async fn it_should_fail_open_gate_due_to_wrong_password() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::Password("correct_password".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::Password("wrong_password".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[tokio::test]
    async fn it_should_fail_open_gate_due_to_unsupported_gate_key() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::TelegramGroup("some_group".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::TelegramGroup("some_group".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::UnsupportedGateKey(_))
        ));
    }

    #[tokio::test]
    async fn it_should_fail_open_otp_email_gate_due_to_no_otp_sent() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPEmail("test@example.com".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act (no OTP record seeded)
        let result = service
            .open_gate(
                &gate.id,
                GateKey::OTPEmail("123456".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains("No OTP code found"),
                "Expected 'No OTP code found', got: {}",
                msg
            );
        }
    }

    #[tokio::test]
    async fn it_should_fail_open_otp_email_gate_due_to_wrong_code() {
        // Arrange
        let (mut service, repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPEmail("test@example.com".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();
        seed_otp_record(
            &repos,
            &gate.id,
            user,
            OtpRecord {
                code: "123456".to_string(),
                expires_at: u64::MAX,
                attempts: 0,
            },
        );

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::OTPEmail("999999".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains("Invalid OTP code"),
                "Expected 'Invalid OTP code', got: {}",
                msg
            );
        }
    }

    #[tokio::test]
    async fn it_should_fail_open_xowned_account_gate_due_to_handle_mismatch() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XOwnedAccount("cashierapp".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XOwnedAccount("alice".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[tokio::test]
    async fn it_should_fail_open_xfollowing_gate_due_to_not_following() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::with_json_response(
            200,
            r#"{"status":"success","message":"ok","data":{"following":false,"followed_by":false}}"#,
        );
        let secrets = MockSecretService::with_entry(SECRET_TWITTER_API_KEY, "test_twitter_key");
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XFollowing("cashierapp".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XFollowing("alice".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[tokio::test]
    async fn it_should_fail_open_xliked_post_gate_due_to_tweet_not_liked() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        // HTTP returns a tweet with id "999", gate is locked to tweet "111"
        let http = MockHttpOutcallService::with_json_response(
            200,
            r#"{"data":[{"id":"999","referenced_tweets":null}]}"#,
        );
        let (_, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XLikedPost("https://x.com/user/status/111".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XLikedPostCredential {
                    user_id: "1".to_string(),
                    access_token: "tok".to_string(),
                },
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[tokio::test]
    async fn it_should_fail_open_xretweeted_post_gate_due_to_tweet_not_retweeted() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        // HTTP returns a retweet of "999", but gate requires tweet "111"
        let http = MockHttpOutcallService::with_json_response(
            200,
            r#"{"data":[{"id":"xyz","referenced_tweets":[{"type":"retweeted","id":"999"}]}]}"#,
        );
        let secrets = MockSecretService::with_entry(SECRET_X_BEARER_TOKEN, "test_bearer_token");
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XRetweetedPost("https://x.com/user/status/111".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XRetweetedPostCredential {
                    user_id: "1".to_string(),
                },
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    // ── open_gate success cases ────────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_open_otp_email_gate() {
        // Arrange
        let (mut service, repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPEmail("test@example.com".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();
        seed_otp_record(
            &repos,
            &gate.id,
            user,
            OtpRecord {
                code: "123456".to_string(),
                expires_at: u64::MAX,
                attempts: 0,
            },
        );

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::OTPEmail("123456".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate.id, gate.id);
        assert_eq!(result.gate_user_status.gate_id, gate.id);
        assert_eq!(result.gate_user_status.user_id, user);
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
    }

    #[tokio::test]
    async fn it_should_open_otp_sms_gate() {
        // Arrange
        let (mut service, repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::OTPSms("+1234567890".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();
        seed_otp_record(
            &repos,
            &gate.id,
            user,
            OtpRecord {
                code: "123456".to_string(),
                expires_at: u64::MAX,
                attempts: 0,
            },
        );

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::OTPSms("123456".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
        assert_eq!(result.gate_user_status.user_id, user);
    }

    #[tokio::test]
    async fn it_should_open_xowned_account_gate() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let (http, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XOwnedAccount("CashierApp".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XOwnedAccount("cashierapp".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
    }

    #[tokio::test]
    async fn it_should_open_xfollowing_gate() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::with_json_response(
            200,
            r#"{"status":"success","message":"ok","data":{"following":true,"followed_by":false}}"#,
        );
        let secrets = MockSecretService::with_entry(SECRET_TWITTER_API_KEY, "test_twitter_key");
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XFollowing("cashierapp".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XFollowing("alice".into()),
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
    }

    #[tokio::test]
    async fn it_should_open_xliked_post_gate() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::with_json_response(
            200,
            r#"{"data":[{"id":"111","referenced_tweets":null}]}"#,
        );
        let (_, secrets) = fixture_of_services();
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XLikedPost("https://x.com/user/status/111".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XLikedPostCredential {
                    user_id: "1".to_string(),
                    access_token: "tok".to_string(),
                },
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
    }

    #[tokio::test]
    async fn it_should_open_xretweeted_post_gate() {
        // Arrange
        let (mut service, _repos) = fixture_of_gate_service();
        let http = MockHttpOutcallService::with_json_response(
            200,
            r#"{"data":[{"id":"xyz","referenced_tweets":[{"type":"retweeted","id":"111"}]}]}"#,
        );
        let secrets = MockSecretService::with_entry(SECRET_X_BEARER_TOKEN, "test_bearer_token");
        let creator = random_principal_id();
        let gate = service
            .add_gate(
                creator,
                NewGate {
                    subject_id: random_id_string(),
                    key: GateKey::XRetweetedPost("https://x.com/user/status/111".to_string()),
                },
            )
            .unwrap();
        let user = random_principal_id();

        // Act
        let result = service
            .open_gate(
                &gate.id,
                GateKey::XRetweetedPostCredential {
                    user_id: "1".to_string(),
                },
                user,
                &http,
                &secrets,
                0,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
    }
}
