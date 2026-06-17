// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod auth;
pub mod constant;
pub mod error;
pub mod init;
pub mod secret;
pub mod x_response;

pub use secret::{PasswordHashingAlgorithm, SecretStorageMode};

use candid::{self, CandidType, Deserialize, Principal};
use cashier_macros::storable;
use serde::Serialize;

#[derive(CandidType, Debug, Clone)]
#[storable]
/// The data structure for a Gate
/// Fields:
/// * `id`: The unique identifier for the gate.
/// * `creator`: The creator of the gate.
/// * `subject_id`: The ID of the object being gated (Links, Campaigns, MysteryBoxes, etc)
/// * `key`: The key of the gate.
pub struct Gate {
    pub id: String,
    pub creator: Principal,
    pub subject_id: String,
    pub key: GateKey,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// The data structure for creating a new Gate
/// Fields:
/// * `subject_id`: The ID of the object being gated (Links, Campaigns, MysteryBoxes, etc)
/// * `key`: The key of the gate.
pub struct NewGate {
    pub subject_id: String,
    pub key: GateKey,
}

#[derive(CandidType, Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
#[storable]
/// The data structure for a pair of Gate and User
/// It is used as an unique identifier to look up the gate's status specifically for a user.
/// Fields:
/// * `gate_id`: The ID of the gate.
/// * `user_id`: The ID of the user.
pub struct GateUser {
    pub gate_id: String,
    pub user_id: Principal,
}

#[derive(CandidType, Debug, Clone)]
#[storable]
/// The data structure for a Gate's status for a specific user
/// Fields:
/// * `gate_id`: The ID of the gate.
/// * `user_id`: The ID of the user.
/// * `status`: The status of the gate for the user.
pub struct GateUserStatus {
    pub gate_id: String,
    pub user_id: Principal,
    pub status: GateStatus,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// The data structure for a Gate and its status for a specific user
/// Fields:
/// * `gate`: The gate information.
/// * `gate_user_status`: The status of the gate for the user, if it exists.
pub struct GateForUser {
    pub gate: Gate,
    pub gate_user_status: Option<GateUserStatus>,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
/// The gate status enum
pub enum GateStatus {
    Open,
    Closed,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
/// The gate key enum
pub enum GateKey {
    Password(String),
    PasswordRedacted,
    XFollowing(String),
    TelegramGroup(String),
    DiscordServer(String),
    /// Gate config: target X handle. Credential: the user's X handle (from OAuth profile).
    XOwnedAccount(String),
    /// Gate config: tweet URL. Credential: use XLikedPostCredential.
    XLikedPost(String),
    /// Gate config: tweet URL. Credential: use XRetweetedPostCredential.
    XRetweetedPost(String),
    /// User credential for opening an XLikedPost gate.
    XLikedPostCredential {
        user_id: String,
        access_token: String,
    },
    /// User credential for opening an XRetweetedPost gate.
    XRetweetedPostCredential {
        user_id: String,
    },
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
/// The verification gate key result enum
pub enum VerificationResult {
    Success,
    Failure(String),
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// The data structure for a successful gate opening result
/// Fields:
/// * `gate`: The gate information.
/// * `gate_user_status`: The status of the gate for the user.
pub struct OpenGateSuccessResult {
    pub gate: Gate,
    pub gate_user_status: GateUserStatus,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// The public profile of an X (Twitter) user returned after OAuth token exchange.
/// Fields:
/// * `id`: The X user ID.
/// * `name`: The display name.
/// * `username`: The @handle (without the @ prefix).
/// * `profile_image_url`: URL of the user's avatar image.
pub struct XProfile {
    pub id: String,
    pub name: String,
    pub username: String,
    pub profile_image_url: String,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// Result of the X OAuth token exchange.
/// Fields:
/// * `profile`: The authenticated user's public X profile.
/// * `access_token`: The OAuth 2.0 access token for making X API calls on behalf of the user.
pub struct XTokenExchangeResult {
    pub profile: XProfile,
    pub access_token: String,
}
