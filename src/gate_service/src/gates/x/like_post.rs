// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use gate_service_types::constant::X_LIKED_TWEETS_URL;
use ic_cdk::management_canister::http_request as canister_http_outcall;
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs};
use std::{fmt::Debug, future::Future, pin::Pin};

/// Verifier for the X-liked-post gate.
/// Checks that the user has liked the configured tweet by querying
/// `GET /2/users/:id/liked_tweets` (first 100 results) using the user's OAuth token.
pub struct XLikedPostVerifier {
    tweet_url: String,
}

impl GateVerifier for XLikedPostVerifier {
    fn verify(
        &self,
        key: GateKey,
    ) -> Pin<Box<dyn Future<Output = Result<VerificationResult, GateServiceError>>>> {
        let tweet_url = self.tweet_url.clone();
        Box::pin(async move {
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

            let tweet_id = super::parse_tweet_id(&tweet_url)?;
            let url = X_LIKED_TWEETS_URL.replacen("{}", &user_id, 1);

            let arg = HttpRequestArgs {
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

            let http_response = canister_http_outcall(&arg)
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
        })
    }
}

impl Debug for XLikedPostVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "XLikedPostVerifier(url={})", self.tweet_url)
    }
}

impl XLikedPostVerifier {
    /// Creates a new XLikedPostVerifier for the given tweet URL.
    pub fn new(tweet_url: String) -> Self {
        Self { tweet_url }
    }
}
