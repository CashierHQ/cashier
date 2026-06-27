// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::{
    PLAIN_SECRETS_STORE, SECRET_STORAGE_MODE, SECRETS_STORE, secrets::SecretRepository,
};
use gate_service_types::constant::{
    SECRET_X_OAUTH_BASIC_AUTH, SECRET_X_REDIRECT_URI, X_PROFILE_URL, X_TOKEN_URL,
};
use gate_service_types::x_response::{OAuthTokenResponse, XProfileResponse};
use gate_service_types::{XProfile, XTokenExchangeResult, error::GateServiceError};
use ic_cdk::management_canister::http_request as canister_http_outcall;
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs, HttpRequestResult};

/// Exchanges an X OAuth 2.0 authorization code for an access token, then
/// fetches and returns the authenticated user's public profile along with the token.
///
/// Uses non-replicated HTTP outcalls (`is_replicated: Some(false)`) so that
/// single-use authorization codes are consumed exactly once.
/// # Arguments
/// * `code`: The one-time OAuth 2.0 authorization code received from the X callback.
/// # Returns
/// * `Ok(XTokenExchangeResult)`: The user's profile and their bearer access token.
/// * `Err(GateServiceError)`: Token exchange failed, profile fetch failed, or a required
///   secret (`x_oauth_basic_auth`, `x_redirect_uri`) is missing.
pub async fn exchange_x_token(code: String) -> Result<XTokenExchangeResult, GateServiceError> {
    let secret_repo =
        SecretRepository::new(&SECRETS_STORE, &PLAIN_SECRETS_STORE, &SECRET_STORAGE_MODE);
    let redirect_uri = secret_repo
        .get_decrypted_secret(SECRET_X_REDIRECT_URI)
        .await?;
    let basic_auth = secret_repo
        .get_decrypted_secret(SECRET_X_OAUTH_BASIC_AUTH)
        .await?;

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

/// Percent-encodes a string for use in `application/x-www-form-urlencoded` bodies.
/// # Arguments
/// * `input`: The raw string to encode.
/// # Returns
/// The percent-encoded string; unreserved characters (`A-Z a-z 0-9 - _ . ~`) are passed through.
fn url_encode(input: &str) -> String {
    input
        .chars()
        .flat_map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => vec![c],
            c => format!("%{:02X}", c as u8).chars().collect::<Vec<_>>(),
        })
        .collect()
}

/// Extracts the `access_token` field from an X OAuth token response.
/// # Arguments
/// * `http_result`: Raw HTTP response from the X token endpoint.
/// # Returns
/// * `Ok(String)`: The bearer access token string.
/// * `Err(GateServiceError::KeyVerificationFailed)`: Non-UTF-8 body, or JSON parse failure.
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

/// Parses an X profile response into an `XProfile` value.
/// # Arguments
/// * `http_result`: Raw HTTP response from the X user-info endpoint.
/// # Returns
/// * `Ok(XProfile)`: Profile with `id`, `name`, `username`, and `profile_image_url`.
/// * `Err(GateServiceError::KeyVerificationFailed)`: Non-UTF-8 body, or JSON parse failure.
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

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;

    fn fixture_of_http_result(body: &str) -> HttpRequestResult {
        HttpRequestResult {
            status: Nat::from(200u32),
            headers: vec![],
            body: body.as_bytes().to_vec(),
        }
    }

    #[test]
    fn it_should_fail_url_encode_due_to_special_chars() {
        assert_eq!(url_encode(" "), "%20");
        assert_eq!(url_encode("a=b&c=d"), "a%3Db%26c%3Dd");
        assert_eq!(url_encode("/path?q=1"), "%2Fpath%3Fq%3D1");
    }

    #[test]
    fn it_should_url_encode_pass_through_unreserved_chars() {
        assert_eq!(url_encode("abcXYZ123-_.~"), "abcXYZ123-_.~");
    }

    #[test]
    fn it_should_fail_decode_token_response_due_to_invalid_json() {
        // Arrange
        let http_result = fixture_of_http_result("not json");

        // Act
        let result = decode_token_response(http_result);

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[test]
    fn it_should_fail_decode_token_response_due_to_missing_required_field() {
        // Arrange
        let http_result = fixture_of_http_result(r#"{"token_type":"bearer"}"#);

        // Act
        let result = decode_token_response(http_result);

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[test]
    fn it_should_decode_token_response() {
        // Arrange
        let http_result =
            fixture_of_http_result(r#"{"access_token":"tok_abc123","token_type":"bearer"}"#);

        // Act
        let result = decode_token_response(http_result);

        // Assert
        assert_eq!(result.unwrap(), "tok_abc123");
    }

    #[test]
    fn it_should_fail_decode_profile_response_due_to_invalid_json() {
        // Arrange
        let http_result = fixture_of_http_result("not json");

        // Act
        let result = decode_profile_response(http_result);

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[test]
    fn it_should_fail_decode_profile_response_due_to_missing_data_field() {
        // Arrange
        let http_result = fixture_of_http_result(r#"{"error":"Forbidden"}"#);

        // Act
        let result = decode_profile_response(http_result);

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }

    #[test]
    fn it_should_decode_profile_response() {
        // Arrange
        let http_result = fixture_of_http_result(
            r#"{"data":{"id":"123456","name":"Cashier App","username":"cashierapp","profile_image_url":"https://pbs.twimg.com/profile/photo.jpg"}}"#,
        );

        // Act
        let result = decode_profile_response(http_result);

        // Assert
        let profile = result.unwrap();
        assert_eq!(profile.id, "123456");
        assert_eq!(profile.name, "Cashier App");
        assert_eq!(profile.username, "cashierapp");
        assert_eq!(
            profile.profile_image_url,
            "https://pbs.twimg.com/profile/photo.jpg"
        );
    }

    #[test]
    fn it_should_decode_profile_response_with_absent_profile_image_url() {
        // Arrange
        let http_result = fixture_of_http_result(
            r#"{"data":{"id":"789","name":"Test User","username":"testuser"}}"#,
        );

        // Act
        let result = decode_profile_response(http_result);

        // Assert
        let profile = result.unwrap();
        assert_eq!(profile.id, "789");
        assert_eq!(profile.profile_image_url, "");
    }
}
