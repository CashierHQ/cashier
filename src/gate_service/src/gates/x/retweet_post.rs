// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use crate::repositories::get_decrypted_secret;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use gate_service_types::constant::{SECRET_X_BEARER_TOKEN, X_USER_TWEETS_URL};
use ic_cdk::management_canister::http_request as canister_http_outcall;
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs};
use std::{fmt::Debug, future::Future, pin::Pin};

/// Verifier for the X-retweeted-post gate.
/// Checks that the user has retweeted the configured tweet by querying
/// `GET /2/users/:id/tweets` (first 100 results) using the app bearer token.
pub struct XRetweetedPostVerifier {
    tweet_url: String,
}

impl GateVerifier for XRetweetedPostVerifier {
    fn verify(
        &self,
        key: GateKey,
    ) -> Pin<Box<dyn Future<Output = Result<VerificationResult, GateServiceError>>>> {
        let tweet_url = self.tweet_url.clone();
        Box::pin(async move {
            let user_id = match key {
                GateKey::XRetweetedPostCredential { user_id } => user_id,
                _ => {
                    return Err(GateServiceError::InvalidKeyType(
                        "XRetweetedPostVerifier".to_string(),
                    ));
                }
            };

            let tweet_id = super::parse_tweet_id(&tweet_url)?;
            let bearer_token = get_decrypted_secret(SECRET_X_BEARER_TOKEN).await?;
            let url = X_USER_TWEETS_URL.replacen("{}", &user_id, 1);

            let arg = HttpRequestArgs {
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

            let http_response = canister_http_outcall(&arg)
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
        })
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
