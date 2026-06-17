// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use crate::services::{http::HttpOutcallService, secret::SecretService};
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use gate_service_types::constant::{SECRET_X_BEARER_TOKEN, X_USER_TWEETS_URL};
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs};
use std::fmt::Debug;

/// Verifier for the X-retweeted-post gate.
/// Checks that the user has retweeted the configured tweet by querying
/// `GET /2/users/:id/tweets` (first 100 results) using the app bearer token.
pub struct XRetweetedPostVerifier {
    tweet_url: String,
}

impl GateVerifier for XRetweetedPostVerifier {
    async fn verify<H: HttpOutcallService, S: SecretService>(
        &self,
        key: GateKey,
        http: &H,
        secrets: &S,
    ) -> Result<VerificationResult, GateServiceError> {
        let user_id = match key {
            GateKey::XRetweetedPostCredential { user_id } => user_id,
            _ => {
                return Err(GateServiceError::InvalidKeyType(
                    "XRetweetedPostVerifier".to_string(),
                ));
            }
        };

        let tweet_id = super::parse_tweet_id(&self.tweet_url)?;
        let bearer_token = secrets.get_secret(SECRET_X_BEARER_TOKEN).await?;
        let url = X_USER_TWEETS_URL.replacen("{}", &user_id, 1);

        let args = HttpRequestArgs {
            url,
            max_response_bytes: Some(65536),
            method: HttpMethod::GET,
            headers: vec![HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {bearer_token}"),
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

        let retweeted = response.data.unwrap_or_default().iter().any(|t| {
            t.referenced_tweets
                .as_deref()
                .unwrap_or_default()
                .iter()
                .any(|r| r.kind == "retweeted" && r.id == tweet_id)
        });

        if retweeted {
            Ok(VerificationResult::Success)
        } else {
            Ok(VerificationResult::Failure(format!(
                "user has not retweeted tweet {tweet_id} (checked last 100 tweets)"
            )))
        }
    }
}

impl Debug for XRetweetedPostVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "XRetweetedPostVerifier(url={})", self.tweet_url)
    }
}

impl XRetweetedPostVerifier {
    /// Creates a new XRetweetedPostVerifier for the given tweet URL.
    pub fn new(tweet_url: String) -> Self {
        Self { tweet_url }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::http::test_utils::MockHttpOutcallService;
    use crate::services::secret::test_utils::MockSecretService;
    use gate_service_types::constant::SECRET_X_BEARER_TOKEN;

    const TWEET_URL: &str = "https://x.com/cashierapp/status/9876543210";
    const TWEET_ID: &str = "9876543210";

    fn fixture_of_retweet_body(retweeted_id: &str) -> String {
        format!(
            r#"{{"data":[{{"id":"rt_111","referenced_tweets":[{{"type":"retweeted","id":"{retweeted_id}"}}]}}]}}"#
        )
    }

    // ── verify (key type guard) ───────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_fail_verify_due_to_invalid_gate_key() {
        // Arrange
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::with_entry(SECRET_X_BEARER_TOKEN, "dummy");
        let verifier = XRetweetedPostVerifier::new(TWEET_URL.to_string());

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("cashierapp".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XRetweetedPostVerifier"));
        }
    }

    #[tokio::test]
    async fn it_should_fail_verify_due_to_password_key() {
        // Arrange
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::with_entry(SECRET_X_BEARER_TOKEN, "dummy");
        let verifier = XRetweetedPostVerifier::new(TWEET_URL.to_string());

        // Act
        let result = verifier
            .verify(GateKey::Password("secret".to_string()), &http, &secrets)
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
    }

    // ── verify (full path) ────────────────────────────────────────────────────

    #[tokio::test]
    async fn it_should_return_success_when_api_confirms_retweeted() {
        // Arrange
        let body = fixture_of_retweet_body(TWEET_ID);
        let http = MockHttpOutcallService::with_json_response(200, &body);
        let secrets = MockSecretService::with_entry(SECRET_X_BEARER_TOKEN, "dummy_bearer");
        let verifier = XRetweetedPostVerifier::new(TWEET_URL.to_string());
        let key = GateKey::XRetweetedPostCredential {
            user_id: "user_42".to_string(),
        };

        // Act
        let result = verifier.verify(key, &http, &secrets).await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_return_failure_when_tweet_not_in_retweet_list() {
        // Arrange
        let body = fixture_of_retweet_body("1111111111"); // different tweet
        let http = MockHttpOutcallService::with_json_response(200, &body);
        let secrets = MockSecretService::with_entry(SECRET_X_BEARER_TOKEN, "dummy_bearer");
        let verifier = XRetweetedPostVerifier::new(TWEET_URL.to_string());
        let key = GateKey::XRetweetedPostCredential {
            user_id: "user_42".to_string(),
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
    async fn it_should_fail_verify_when_bearer_token_secret_is_missing() {
        // Arrange
        let http = MockHttpOutcallService::new(vec![]);
        let secrets = MockSecretService::new(std::collections::HashMap::new());
        let verifier = XRetweetedPostVerifier::new(TWEET_URL.to_string());
        let key = GateKey::XRetweetedPostCredential {
            user_id: "user_42".to_string(),
        };

        // Act
        let result = verifier.verify(key, &http, &secrets).await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::KeyVerificationFailed(_))));
    }

    #[tokio::test]
    async fn it_should_fail_verify_when_api_returns_error_status() {
        // Arrange
        let http = MockHttpOutcallService::with_json_response(429, r#"{"title":"Too Many Requests"}"#);
        let secrets = MockSecretService::with_entry(SECRET_X_BEARER_TOKEN, "dummy_bearer");
        let verifier = XRetweetedPostVerifier::new(TWEET_URL.to_string());
        let key = GateKey::XRetweetedPostCredential {
            user_id: "user_42".to_string(),
        };

        // Act
        let result = verifier.verify(key, &http, &secrets).await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::KeyVerificationFailed(_))));
    }

}
