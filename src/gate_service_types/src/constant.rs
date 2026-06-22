// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/// TwitterAPI.io endpoint for checking follow relationships.
pub const TWITTER_API_URL: &str =
    "https://api.twitterapi.io/twitter/user/check_follow_relationship";

/// X OAuth 2.0 token endpoint.
pub const X_TOKEN_URL: &str = "https://api.x.com/2/oauth2/token";

/// X API endpoint for the authenticated user's own profile.
pub const X_PROFILE_URL: &str =
    "https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url";

/// X API endpoint for a user's liked tweets (placeholder `{}` = user ID).
pub const X_LIKED_TWEETS_URL: &str = "https://api.x.com/2/users/{}/liked_tweets?max_results=100";

/// X API endpoint for a user's own tweets (placeholder `{}` = user ID).
pub const X_USER_TWEETS_URL: &str =
    "https://api.x.com/2/users/{}/tweets?max_results=100&tweet.fields=referenced_tweets";

/// Secret key name for the TwitterAPI.io API key.
/// Set via `admin_secret_set` / `admin_plain_secret_set` canister endpoints.
pub const SECRET_TWITTER_API_KEY: &str = "twitter_api_key";

/// Secret key name for the X OAuth 2.0 Basic Auth credential (base64 `client_id:client_secret`).
pub const SECRET_X_OAUTH_BASIC_AUTH: &str = "x_oauth_basic_auth";

/// Secret key name for the X OAuth redirect URI.
pub const SECRET_X_REDIRECT_URI: &str = "x_redirect_uri";

/// Secret key name for the X API Bearer token.
pub const SECRET_X_BEARER_TOKEN: &str = "x_bearer_token";

/// Brevo transactional email API endpoint.
pub const BREVO_EMAIL_URL: &str = "https://api.brevo.com/v3/smtp/email";

/// Brevo transactional SMS API endpoint.
pub const BREVO_SMS_URL: &str = "https://api.brevo.com/v3/transactionalSMS/send";

/// Secret key name for the Brevo API key.
/// Set via `admin_secret_set` / `admin_plain_secret_set` canister endpoints.
pub const SECRET_BREVO_API_KEY: &str = "brevo_api_key";

/// Secret key name for the Brevo email sender address.
/// Set via `admin_secret_set` / `admin_plain_secret_set` canister endpoints.
pub const SECRET_BREVO_EMAIL_SENDER: &str = "brevo_email_sender";

/// IC network key name used for vetKD derivation.
/// "key_1" is available on all IC networks (local dfx uses "dfx_test_key" for local testing only).
pub const VETKEY_NAME: &str = "key_1";

/// Derivation context — must match what the admin script passes to `vetkd_public_key`.
pub const VETKEY_CONTEXT: &[u8] = b"cashier-gate-secrets";

/// Derivation input — the identity used for all API secret keys.
pub const VETKEY_INPUT: &[u8] = b"cashier-gate-secrets";

/// HKDF domain separator used by `VetKey::derive_symmetric_key`.
pub const VETKEY_SYMMETRIC_DOMAIN: &str = "cashier-api-secrets-v1";
