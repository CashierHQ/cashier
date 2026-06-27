// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use crate::services::{http::HttpOutcallService, secret::SecretService};
use gate_service_types::constant::X_LIKED_TWEETS_URL;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs};
use std::fmt::Debug;

/// Verifier for the X-liked-post gate.
/// Checks that the user has liked the configured tweet by querying
/// `GET /2/users/:id/liked_tweets` (first 100 results) using the user's OAuth token.
pub struct XLikedPostVerifier {
    tweet_url: String,
}

impl XLikedPostVerifier {
    /// Creates a new verifier for the given tweet URL.
    /// # Arguments
    /// * `tweet_url`: Full URL of the tweet that the user must have liked
    ///   (e.g. `"https://x.com/cashierapp/status/1234567890"`).
    pub fn new(tweet_url: String) -> Self {
        Self { tweet_url }
    }
}

impl Debug for XLikedPostVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "XLikedPostVerifier(url={})", self.tweet_url)
    }
}

impl GateVerifier for XLikedPostVerifier {
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        http: &H,
        _secrets: &S,
    ) -> Result<VerificationResult, GateServiceError> {
        let (user_id, access_token) = match key {
            GateKey::XLikedPostCredential {
                user_id,
                access_token,
            } => (user_id, access_token),
            _ => {
                return Err(GateServiceError::InvalidKeyType(
                    "XLikedPostVerifier".to_string(),
                ));
            }
        };

        let tweet_id = super::parse_tweet_id(&self.tweet_url)?;
        let url = X_LIKED_TWEETS_URL.replacen("{}", &user_id, 1);

        let args = HttpRequestArgs {
            url,
            max_response_bytes: Some(32768),
            method: HttpMethod::GET,
            headers: vec![HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {access_token}"),
            }],
            body: None,
            transform: None,
            is_replicated: Some(false),
        };

        let http_response = http
            .execute(args)
            .await
            .map_err(|e| GateServiceError::KeyVerificationFailed(e.to_string()))?;

        let response = super::decode_tweets_response(http_response)?;

        let liked = response
            .data
            .unwrap_or_default()
            .iter()
            .any(|t| t.id == tweet_id);

        if liked {
            Ok(VerificationResult::Success)
        } else {
            Ok(VerificationResult::Failure(format!(
                "user has not liked tweet {tweet_id} (checked last 100 likes)"
            )))
        }
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use std::collections::HashMap;

    const TWEET_URL: &str = "https://x.com/cashierapp/status/1234567890";
    const TWEET_ID: &str = "1234567890";

    fn fixture_of_no_secrets() -> MockSecretService {
        MockSecretService::new(HashMap::new())
    }

    fn fixture_of_liked_tweets_body(tweet_ids: &[&str]) -> String {
        let ids_json: Vec<String> = tweet_ids
            .iter()
            .map(|id| format!(r#"{{"id":"{id}","referenced_tweets":null}}"#))
            .collect();
        format!(r#"{{"data":[{}]}}"#, ids_json.join(","))
    }

    #[tokio::test]
    async fn it_should_fail_verify_due_to_invalid_gate_key() {
        // Arrange
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = fixture_of_no_secrets();
        let verifier = XLikedPostVerifier::new(TWEET_URL.to_string());

        // Act
        let result = verifier
            .verify(
                GateKey::XFollowing("cashierapp".to_string()),
                &http,
                &secrets,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XLikedPostVerifier"));
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_due_to_password_key() {
        // Arrange
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = fixture_of_no_secrets();
        let verifier = XLikedPostVerifier::new(TWEET_URL.to_string());

        // Act
        let result = verifier
            .verify(GateKey::Password("secret".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
    }

    #[tokio::test]
    async fn it_should_return_success_when_api_confirms_liked() {
        // Arrange
        let body = fixture_of_liked_tweets_body(&["111", TWEET_ID, "333"]);
        let http = MockHttpOutcallService::with_json_response(200, &body);
        let secrets = fixture_of_no_secrets();
        let verifier = XLikedPostVerifier::new(TWEET_URL.to_string());
        let key = GateKey::XLikedPostCredential {
            user_id: "user_42".to_string(),
            access_token: "tok".to_string(),
        };

        // Act
        let result = verifier.verify(key, &http, &secrets).await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_return_failure_when_tweet_not_in_liked_list() {
        // Arrange
        let body = fixture_of_liked_tweets_body(&["111", "222"]);
        let http = MockHttpOutcallService::with_json_response(200, &body);
        let secrets = fixture_of_no_secrets();
        let verifier = XLikedPostVerifier::new(TWEET_URL.to_string());
        let key = GateKey::XLikedPostCredential {
            user_id: "user_42".to_string(),
            access_token: "tok".to_string(),
        };

        // Act
        let result = verifier.verify(key, &http, &secrets).await;

        // Assert
        if let Ok(VerificationResult::Failure(msg)) = result {
            assert!(msg.contains(TWEET_ID));
        } else {
            panic!("Expected Failure variant but got {:?}", result);
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_when_api_returns_error_status() {
        // Arrange
        let http =
            MockHttpOutcallService::with_json_response(429, r#"{"title":"Too Many Requests"}"#);
        let secrets = fixture_of_no_secrets();
        let verifier = XLikedPostVerifier::new(TWEET_URL.to_string());
        let key = GateKey::XLikedPostCredential {
            user_id: "user_42".to_string(),
            access_token: "tok".to_string(),
        };

        // Act
        let result = verifier.verify(key, &http, &secrets).await;

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }
}
