use crate::gates::GateVerifier;
use crate::repositories::get_decrypted_secret;
use gate_service_types::{
    GateKey, VerificationResult, XProfile, XTokenExchangeResult, error::GateServiceError,
};
use ic_cdk::management_canister::http_request as canister_http_outcall;
use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestArgs, HttpRequestResult};
use serde::{Deserialize, Serialize};
use std::{fmt::Debug, future::Future, pin::Pin};

const TWITTER_API_URL: &str = "https://api.twitterapi.io/twitter/user/check_follow_relationship";
const X_TOKEN_URL: &str = "https://api.x.com/2/oauth2/token";
const X_PROFILE_URL: &str =
    "https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url";
const X_LIKED_TWEETS_URL: &str = "https://api.x.com/2/users/{}/liked_tweets?max_results=100";
const X_USER_TWEETS_URL: &str =
    "https://api.x.com/2/users/{}/tweets?max_results=100&tweet.fields=referenced_tweets";

/// Secret key names — set via admin_secret_set / admin_plain_secret_set canister endpoints.
const SECRET_TWITTER_API_KEY: &str = "twitter_api_key";
const SECRET_X_OAUTH_BASIC_AUTH: &str = "x_oauth_basic_auth";
const SECRET_X_REDIRECT_URI: &str = "x_redirect_uri";
const SECRET_X_BEARER_TOKEN: &str = "x_bearer_token";

// ── Response structs ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
struct XFollowingResponse {
    status: String,
    message: String,
    data: FollowStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FollowStatus {
    following: bool,
    followed_by: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OAuthTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    token_type: String,
    expires_in: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct XProfileResponse {
    data: XProfileData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct XProfileData {
    id: String,
    name: String,
    username: String,
    profile_image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct XTweetsResponse {
    data: Option<Vec<XTweetItem>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct XTweetItem {
    id: String,
    referenced_tweets: Option<Vec<XReferencedTweet>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct XReferencedTweet {
    #[serde(rename = "type")]
    kind: String,
    id: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Extracts the tweet ID from a URL like `https://x.com/user/status/1234567890`.
fn parse_tweet_id(tweet_url: &str) -> Result<String, GateServiceError> {
    tweet_url
        .rsplit('/')
        .next()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| GateServiceError::InvalidKeyType(format!("invalid tweet URL: {tweet_url}")))
}

// ── XGateVerifier (follow) ────────────────────────────────────────────────────

/// Verifier for the X-following gate.
/// Checks whether a given source account follows the configured target account
/// by querying the TwitterAPI.io service.
pub struct XGateVerifier {
    target_handle: String,
}

impl GateVerifier for XGateVerifier {
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
                        "XGateVerifier".to_string(),
                    ));
                }
            };

            let api_key = get_decrypted_secret(SECRET_TWITTER_API_KEY).await?;

            let url = format!(
                "{}?source_user_name={}&target_user_name={}",
                TWITTER_API_URL, source_handle, target_handle
            );

            let request_headers = vec![HttpHeader {
                name: "X-API-Key".to_string(),
                value: api_key,
            }];

            let arg = HttpRequestArgs {
                url,
                max_response_bytes: Some(2048),
                method: HttpMethod::GET,
                headers: request_headers,
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

impl Debug for XGateVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "XGateVerifier(target={})", self.target_handle)
    }
}

impl XGateVerifier {
    /// Creates a new XGateVerifier for the given target handle.
    pub fn new(target_handle: String) -> Self {
        Self { target_handle }
    }
}

// ── XOwnedAccountVerifier ─────────────────────────────────────────────────────

/// Verifier for the X-owned-account gate.
/// Checks that the user's authenticated X handle matches the configured target handle
/// (case-insensitive). No API call required.
pub struct XOwnedAccountVerifier {
    target_handle: String,
}

impl GateVerifier for XOwnedAccountVerifier {
    fn verify(
        &self,
        key: GateKey,
    ) -> Pin<Box<dyn Future<Output = Result<VerificationResult, GateServiceError>>>> {
        let target_handle = self.target_handle.clone();
        Box::pin(async move {
            let user_handle = match key {
                GateKey::XOwnedAccount(handle) => handle,
                _ => {
                    return Err(GateServiceError::InvalidKeyType(
                        "XOwnedAccountVerifier".to_string(),
                    ));
                }
            };

            if user_handle.eq_ignore_ascii_case(&target_handle) {
                Ok(VerificationResult::Success)
            } else {
                Ok(VerificationResult::Failure(format!(
                    "account @{} does not match required @{}",
                    user_handle, target_handle
                )))
            }
        })
    }
}

impl Debug for XOwnedAccountVerifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "XOwnedAccountVerifier(target={})", self.target_handle)
    }
}

impl XOwnedAccountVerifier {
    /// Creates a new XOwnedAccountVerifier for the given target handle.
    pub fn new(target_handle: String) -> Self {
        Self { target_handle }
    }
}

// ── XLikedPostVerifier ────────────────────────────────────────────────────────

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

            let tweet_id = parse_tweet_id(&tweet_url)?;
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

            let response = decode_tweets_response(http_response)?;

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

// ── XRetweetedPostVerifier ────────────────────────────────────────────────────

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

            let tweet_id = parse_tweet_id(&tweet_url)?;
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

            let response = decode_tweets_response(http_response)?;

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

// ── Token exchange ────────────────────────────────────────────────────────────

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

    let token_headers = vec![
        HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/x-www-form-urlencoded".to_string(),
        },
        HttpHeader {
            name: "Authorization".to_string(),
            value: format!("Basic {basic_auth}"),
        },
    ];

    let token_arg = HttpRequestArgs {
        url: X_TOKEN_URL.to_string(),
        max_response_bytes: Some(4096),
        method: HttpMethod::POST,
        headers: token_headers,
        body: Some(form_data.into_bytes()),
        transform: None,
        is_replicated: Some(false),
    };

    let token_response = canister_http_outcall(&token_arg).await.map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("Token request failed: {}", e))
    })?;

    let access_token = decode_token_response(token_response)?;

    let profile_headers = vec![HttpHeader {
        name: "Authorization".to_string(),
        value: format!("Bearer {}", access_token),
    }];

    let profile_arg = HttpRequestArgs {
        url: X_PROFILE_URL.to_string(),
        max_response_bytes: Some(2048),
        method: HttpMethod::GET,
        headers: profile_headers,
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

// ── Decoders ──────────────────────────────────────────────────────────────────

fn url_encode(input: &str) -> String {
    input
        .chars()
        .flat_map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                vec![c]
            }
            c => format!("%{:02X}", c as u8).chars().collect::<Vec<_>>(),
        })
        .collect()
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

fn decode_tweets_response(
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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn it_should_error_verify_due_to_invalid_gate_key() {
        // Arrange
        let verifier = XGateVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::Password("somepassword".to_string()))
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XGateVerifier"));
        } else {
            panic!("Expected InvalidKeyType error but got {:?}", result);
        }
    }

    #[tokio::test]
    async fn it_should_verify_owned_account_success() {
        // Arrange
        let verifier = XOwnedAccountVerifier::new("CashierApp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XOwnedAccount("cashierapp".to_string()))
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Success)));
    }

    #[tokio::test]
    async fn it_should_fail_owned_account_due_to_handle_mismatch() {
        // Arrange
        let verifier = XOwnedAccountVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XOwnedAccount("someone_else".to_string()))
            .await;

        // Assert
        assert!(matches!(result, Ok(VerificationResult::Failure(_))));
    }

    #[tokio::test]
    async fn it_should_fail_owned_account_due_to_wrong_key_type() {
        // Arrange
        let verifier = XOwnedAccountVerifier::new("cashierapp".to_string());

        // Act
        let result = verifier
            .verify(GateKey::XFollowing("cashierapp".to_string()))
            .await;

        // Assert
        assert!(matches!(result, Err(GateServiceError::InvalidKeyType(_))));
    }

    #[test]
    fn it_should_parse_tweet_id_from_url() {
        let url = "https://x.com/LinoLeighton/status/2065488386501059008";
        assert_eq!(parse_tweet_id(url).unwrap(), "2065488386501059008");
    }

    #[test]
    fn it_should_fail_parse_tweet_id_due_to_empty_url() {
        assert!(parse_tweet_id("").is_err());
    }
}
