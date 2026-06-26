// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use gate_service_types::error::GateServiceError;
use gate_service_types::x_response::{XFollowingResponse, XTweetsResponse};
use ic_cdk::management_canister::HttpRequestResult;

/// Extracts the numeric tweet ID from a URL like `https://x.com/user/status/1234567890`.
/// # Arguments
/// * `tweet_url`: Full X tweet URL ending in `/status/<id>`.
/// # Returns
/// * `Ok(String)`: The tweet ID extracted as the last path segment.
/// * `Err(GateServiceError::InvalidKeyType)`: The URL is empty or ends with a trailing slash.
pub fn parse_tweet_id(tweet_url: &str) -> Result<String, GateServiceError> {
    tweet_url
        .rsplit('/')
        .next()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| GateServiceError::InvalidKeyType(format!("invalid tweet URL: {tweet_url}")))
}

/// Parses a TwitterAPI.io following-check response.
/// # Arguments
/// * `http_result`: Raw HTTP response from the TwitterAPI.io following endpoint.
/// # Returns
/// * `Ok(XFollowingResponse)`: Parsed response with `data.following` and `data.followed_by` flags.
/// * `Err(GateServiceError::KeyVerificationFailed)`: Non-UTF-8 body, or JSON parse failure.
pub fn decode_follow_response(
    http_result: HttpRequestResult,
) -> Result<XFollowingResponse, GateServiceError> {
    let body = String::from_utf8(http_result.body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Failed to decode UTF-8: {}", e))
    })?;

    serde_json::from_str::<XFollowingResponse>(&body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Failed to parse JSON: {}", e))
    })
}

/// Parses an X tweets list response (liked tweets or user timeline).
/// # Arguments
/// * `http_result`: Raw HTTP response from an X API v2 tweets endpoint.
/// # Returns
/// * `Ok(XTweetsResponse)`: Parsed list of tweets with optional `referenced_tweets`.
/// * `Err(GateServiceError::KeyVerificationFailed)`: Non-200 status, non-UTF-8 body, or JSON parse failure.
pub fn decode_tweets_response(
    http_result: HttpRequestResult,
) -> Result<XTweetsResponse, GateServiceError> {
    let body = String::from_utf8(http_result.body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Failed to decode tweets UTF-8: {}", e))
    })?;

    if http_result.status != 200u32 {
        return Err(GateServiceError::KeyVerificationFailed(format!(
            "X API returned status {}: {}",
            http_result.status, body
        )));
    }

    serde_json::from_str::<XTweetsResponse>(&body).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!(
            "Failed to parse tweets JSON ({}): {}",
            e, body
        ))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;

    fn fixture_of_http_result(status: u32, body: &str) -> HttpRequestResult {
        HttpRequestResult {
            status: Nat::from(status),
            headers: vec![],
            body: body.as_bytes().to_vec(),
        }
    }

    // ── decode_follow_response ────────────────────────────────────────────────

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

    // ── parse_tweet_id ────────────────────────────────────────────────────────

    #[test]
    fn it_should_parse_tweet_id_from_url() {
        let url = "https://x.com/LinoLeighton/status/2065488386501059008";
        assert_eq!(parse_tweet_id(url).unwrap(), "2065488386501059008");
    }

    #[test]
    fn it_should_fail_parse_tweet_id_due_to_empty_url() {
        assert!(parse_tweet_id("").is_err());
    }

    // ── decode_tweets_response ────────────────────────────────────────────────

    #[test]
    fn it_should_decode_tweets_response_with_data() {
        // Arrange
        let body = r#"{"data":[{"id":"111","referenced_tweets":null},{"id":"222","referenced_tweets":null}]}"#;
        let http_result = fixture_of_http_result(200, body);

        // Act
        let result = decode_tweets_response(http_result);

        // Assert
        assert!(result.is_ok());
        let tweets = result.unwrap().data.unwrap();
        assert_eq!(tweets.len(), 2);
        assert_eq!(tweets[0].id, "111");
    }

    #[test]
    fn it_should_decode_tweets_response_with_empty_data() {
        // Arrange
        let body = r#"{"data":[]}"#;
        let http_result = fixture_of_http_result(200, body);

        // Act
        let result = decode_tweets_response(http_result);

        // Assert
        assert!(result.is_ok());
        assert_eq!(result.unwrap().data.unwrap().len(), 0);
    }

    #[test]
    fn it_should_fail_decode_tweets_response_due_to_non_200_status() {
        // Arrange
        let http_result = fixture_of_http_result(429, r#"{"title":"Too Many Requests"}"#);

        // Act
        let result = decode_tweets_response(http_result);

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
        if let Err(GateServiceError::KeyVerificationFailed(e)) = result {
            assert!(e.contains("429"));
        }
    }

    #[test]
    fn it_should_fail_decode_tweets_response_due_to_invalid_json() {
        // Arrange
        let http_result = fixture_of_http_result(200, "not json");

        // Act
        let result = decode_tweets_response(http_result);

        // Assert
        assert!(matches!(
            result,
            Err(GateServiceError::KeyVerificationFailed(_))
        ));
    }
}
