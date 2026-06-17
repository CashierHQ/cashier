// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use crate::services::{http::HttpOutcallService, secret::SecretService};
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use gate_service_types::constant::{SECRET_TWITTER_API_KEY, TWITTER_API_URL};
use gate_service_types::x_response::XFollowingResponse;
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs, HttpRequestResult};
use std::fmt::Debug;

/// Verifier for the X-following gate.
/// Checks whether a given source account follows the configured target account
/// by querying the TwitterAPI.io service.
pub struct XFollowingVerifier {
    target_handle: String,
}

impl GateVerifier for XFollowingVerifier {
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        http: &H,
        secrets: &S,
    ) -> Result<VerificationResult, GateServiceError> {
        let source_handle = match key {
            GateKey::XFollowing(handle) => handle,
            _ => {
                return Err(GateServiceError::InvalidKeyType(
                    "XFollowingVerifier".to_string(),
                ));
            }
        };

        let api_key = secrets.get_secret(SECRET_TWITTER_API_KEY).await?;

        let url = format!(
            "{}?source_user_name={}&target_user_name={}",
            TWITTER_API_URL, source_handle, self.target_handle
        );

        let args = HttpRequestArgs {
            url,
            max_response_bytes: Some(2048),
            method: HttpMethod::GET,
            headers: vec![HttpHeader {
                name: "X-API-Key".to_string(),
                value: api_key,
            }],
            body: None,
            transform: None,
            is_replicated: Some(false),
        };

        let http_response = http
            .execute(args)
            .await
            .map_err(|e| GateServiceError::KeyVerificationFailed(e.to_string()))?;

        let response = decode_follow_response(http_response)?;

        if response.data.following {
            Ok(VerificationResult::Success)
        } else {
            Ok(VerificationResult::Failure(format!(
                "{source_handle} is not following {}",
                self.target_handle
            )))
        }
    }
}

impl Debug for XFollowingVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "XFollowingVerifier(target={})", self.target_handle)
    }
}

impl XFollowingVerifier {
    /// Creates a new XFollowingVerifier for the given target handle.
    pub fn new(target_handle: String) -> Self {
        Self { target_handle }
    }
}

fn decode_follow_response(
    http_result: HttpRequestResult,
) -> Result<XFollowingResponse, GateServiceError> {
    let body = String::from_utf8(http_result.body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Failed to decode UTF-8: {}", e))
    })?;

    serde_json::from_str::<XFollowingResponse>(&body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Failed to parse JSON: {}", e))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use candid::Nat;
    use gate_service_types::constant::SECRET_TWITTER_API_KEY;

    fn fixture_of_http_result(status: u32, body: &str) -> HttpRequestResult {
        HttpRequestResult {
            status: Nat::from(status),
            headers: vec![],
            body: body.as_bytes().to_vec(),
        }
    }

    fn fixture_of_follow_body(following: bool) -> &'static str {
        if following {
            r#"{"status":"success","message":"ok","data":{"following":true,"followed_by":false}}"#
        } else {
            r#"{"status":"success","message":"ok","data":{"following":false,"followed_by":false}}"#
        }
    }

    // ── verify (key type guard) ───────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_error_verify_due_to_invalid_gate_key() {
        // Arrange
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::with_entry(SECRET_TWITTER_API_KEY, "dummy");
        let verifier = XFollowingVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::Password("somepassword".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XFollowingVerifier"));
        } else {
            panic!("Expected InvalidKeyType but got {:?}", result);
        }
    }

    // ── verify (full path) ────────────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_return_success_when_api_confirms_following() {
        // Arrange
        let http = MockHttpOutcallService::with_json_response(200, fixture_of_follow_body(true));
        let secrets = MockSecretService::with_entry(SECRET_TWITTER_API_KEY, "dummy_key");
        let verifier = XFollowingVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("alice".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_return_failure_when_api_says_not_following() {
        // Arrange
        let http = MockHttpOutcallService::with_json_response(200, fixture_of_follow_body(false));
        let secrets = MockSecretService::with_entry(SECRET_TWITTER_API_KEY, "dummy_key");
        let verifier = XFollowingVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("alice".to_string()), &http, &secrets)
            .await;

        // Assert
        if let Ok(VerificationResult::Failure(msg)) = result {
            assert!(msg.contains("alice"));
            assert!(msg.contains("cashierapp"));
        } else {
            panic!("Expected Failure variant but got {:?}", result);
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_when_api_key_secret_is_missing() {
        // Arrange
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::new(std::collections::HashMap::new()); // no key
        let verifier = XFollowingVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("alice".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::KeyVerificationFailed(_))));
    }

    // ── decode_follow_response ────────────────────────────────────────────────

    #[test]
    fn it_should_decode_follow_response_with_following_true() {
        // Arrange
        let http_result = fixture_of_http_result(
            200,
            r#"{"status":"success","message":"ok","data":{"following":true,"followed_by":false}}"#,
        );

        // Act
        let result = decode_follow_response(http_result);

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap().data.following);
    }

    #[test]
    fn it_should_decode_follow_response_with_following_false() {
        // Arrange
        let http_result = fixture_of_http_result(
            200,
            r#"{"status":"success","message":"ok","data":{"following":false,"followed_by":false}}"#,
        );

        // Act
        let result = decode_follow_response(http_result);

        // Assert
        assert!(result.is_ok());
        assert!(!result.unwrap().data.following);
    }

    #[test]
    fn it_should_fail_decode_follow_response_due_to_invalid_json() {
        // Arrange
        let http_result = fixture_of_http_result(200, "not json");

        // Act
        let result = decode_follow_response(http_result);

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }
}
