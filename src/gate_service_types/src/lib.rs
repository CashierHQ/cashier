pub mod auth;
pub mod error;
pub mod init;

use candid::{self, CandidType, Deserialize, Principal};
use cashier_macros::storable;
use serde::Serialize;

#[derive(CandidType, Debug, Clone)]
#[storable]
/// The data structure for a Gate
/// Fields:
/// * `id`: The unique identifier for the gate.
/// * `subject_id`: The ID of the object being gated (Links, Campaigns, MysteryBoxes, etc)
/// * `gate_type`: The type of the gate.
/// * `key`: The key associated with the gate.
pub struct Gate {
    pub id: String,
    pub subject_id: String,
    pub gate_type: GateType,
    pub key: GateKey,
}

#[derive(CandidType, Debug, Clone)]
#[storable]
/// The data structure for a Gate
/// Fields:
/// * `id`: The unique identifier for the gate.
/// * `subject_id`: The ID of the object being gated (Links, Campaigns, MysteryBoxes, etc)
/// * `key`: The key of the gate.
pub struct GateV2 {
    pub id: String,
    pub creator: Principal,
    pub subject_id: String,
    pub key: GateKey,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// The data structure for creating a new Gate
/// DEPRECATED: Use NewGateV2 instead.
/// Fields:
/// * `subject_id`: The ID of the object being gated (Links, Campaigns, MysteryBoxes, etc)
/// * `gate_type`: The type of the gate.
/// * `key`: The key associated with the gate.
pub struct NewGate {
    pub subject_id: String,
    pub gate_type: GateType,
    pub key: GateKey,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// The v2 of data structure for creating a new Gate
/// Fields:
/// * `subject_id`: The ID of the object being gated (Links, Campaigns, MysteryBoxes, etc)
/// * `key`: The key of the gate.
pub struct NewGateV2 {
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
/// DEPRECATED: The gate type enum
pub enum GateType {
    Password,
    XFollowing,
    TelegramGroup,
    DiscordServer,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
/// The gate key enum
pub enum GateKey {
    Password(String),
    PasswordRedacted,
    XFollowing(String),
    TelegramGroup(String),
    DiscordServer(String),
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
