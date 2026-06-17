// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::get_decrypted_secret;
use gate_service_types::{XProfile, XTokenExchangeResult, error::GateServiceError};
use gate_service_types::constant::{
    SECRET_X_OAUTH_BASIC_AUTH, SECRET_X_REDIRECT_URI, X_PROFILE_URL, X_TOKEN_URL,
};
use gate_service_types::x_response::{OAuthTokenResponse, XProfileResponse};
use ic_cdk::management_canister::http_request as canister_http_outcall;
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs, HttpRequestResult};

/// Exchanges an X OAuth 2.0 authorization code for an access token, then
/// fetches and returns the authenticated user's public profile along with the token.
///
/// Uses non-replicated HTTP outcalls (`is_replicated: Some(false)`) so that
/// single-use authorization codes are consumed exactly once.
pub async fn exchange_x_token(code: String) -> Result<XTokenExchangeResult, GateServiceError> {
    let redirect_uri = get_decrypted_secret(SECRET_X_REDIRECT_URI).await?;
    let basic_auth = get_decrypted_secret(SECRET_X_OAUTH_BASIC_AUTH).await?;

    let form_data = format!(
        "code={}&grant_type=authorization_code&redirect_uri={}&code_verifier={}",
        url_encode(&code),
        url_encode(&redirect_uri),
        url_encode("challenge"),
    );

    let token_arg = HttpRequestArgs {
        url: X_TOKEN_URL.to_string(),
        max_response_bytes: Some(4096),
        method: HttpMethod::POST,
        headers: vec![
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/x-www-form-urlencoded".to_string(),
            },
            HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Basic {basic_auth}"),
            },
        ],
        body: Some(form_data.into_bytes()),
        transform: None,
        is_replicated: Some(false),
    };

    let token_response = canister_http_outcall(&token_arg).await.map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Token request failed: {}", e))
    })?;

    let access_token = decode_token_response(token_response)?;

    let profile_arg = HttpRequestArgs {
        url: X_PROFILE_URL.to_string(),
        max_response_bytes: Some(2048),
        method: HttpMethod::GET,
        headers: vec![HttpHeader {
            name: "Authorization".to_string(),
            value: format!("Bearer {}", access_token),
        }],
        body: None,
        transform: None,
        is_replicated: Some(false),
    };

    let profile_response = canister_http_outcall(&profile_arg).await.map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Profile request failed: {}", e))
    })?;

    let profile = decode_profile_response(profile_response)?;

    Ok(XTokenExchangeResult {
        profile,
        access_token,
    })
}

fn url_encode(input: &str) -> String {
    input
        .chars()
        .flat_map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => vec![c],
            c => format!("%{:02X}", c as u8).chars().collect::<Vec<_>>(),
        })
        .collect()
}

fn decode_token_response(http_result: HttpRequestResult) -> Result<String, GateServiceError> {
    let body = String::from_utf8(http_result.body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Failed to decode token UTF-8: {}", e))
    })?;

    let token: OAuthTokenResponse = serde_json::from_str(&body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!(
            "Failed to parse token JSON ({}): {}",
            e, body
        ))
    })?;

    Ok(token.access_token)
}

fn decode_profile_response(http_result: HttpRequestResult) -> Result<XProfile, GateServiceError> {
    let body = String::from_utf8(http_result.body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Failed to decode profile UTF-8: {}", e))
    })?;

    let response: XProfileResponse = serde_json::from_str(&body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!(
            "Failed to parse profile JSON ({}): {}",
            e, body
        ))
    })?;

    Ok(XProfile {
        id: response.data.id,
        name: response.data.name,
        username: response.data.username,
        profile_image_url: response.data.profile_image_url.unwrap_or_default(),
    })
}
