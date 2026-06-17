// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::gates::GateVerifier;
use crate::repositories::get_decrypted_secret;
use gate_service_types::{GateKey, VerificationResult, error::GateServiceError};
use gate_service_types::constant::{SECRET_TWITTER_API_KEY, TWITTER_API_URL};
use gate_service_types::x_response::XFollowingResponse;
use ic_cdk::management_canister::http_request as canister_http_outcall;
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs, HttpRequestResult};
use std::{fmt::Debug, future::Future, pin::Pin};

/// Verifier for the X-following gate.
/// Checks whether a given source account follows the configured target account
/// by querying the TwitterAPI.io service.
pub struct XFollowingVerifier {
    target_handle: String,
}

impl GateVerifier for XFollowingVerifier {
    fn verify(
        &self,
        key: GateKey,
    ) -> Pin<Box<dyn Future<Output = Result<VerificationResult, GateServiceError>>>> {
        let target_handle = self.target_handle.clone();
        Box::pin(async move {
            let source_handle = match key {
                GateKey::XFollowing(handle) => handle,
                _ => {
                    return Err(GateServiceError::InvalidKeyType(
                        "XFollowingVerifier".to_string(),
                    ));
                }
            };

            let api_key = get_decrypted_secret(SECRET_TWITTER_API_KEY).await?;

            let url = format!(
                "{}?source_user_name={}&target_user_name={}",
                TWITTER_API_URL, source_handle, target_handle
            );

            let arg = HttpRequestArgs {
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

            let http_response = canister_http_outcall(&arg)
                .await
                .map_err(|e| GateServiceError::KeyVerificationFailed(e.to_string()))?;

            let response = decode_follow_response(http_response)?;

            if response.data.following {
                Ok(VerificationResult::Success)
            } else {
                Ok(VerificationResult::Failure(format!(
                    "{} is not following {}",
                    source_handle, target_handle
                )))
            }
        })
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

    #[tokio::test]
    async fn it_should_error_verify_due_to_invalid_gate_key() {
        // Arrange
        let verifier = XFollowingVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::Password("somepassword".to_string()))
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XFollowingVerifier"));
        } else {
            panic!("Expected InvalidKeyType error but got {:?}", result);
        }
    }
}
