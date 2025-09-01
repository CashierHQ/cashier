use async_trait::async_trait;
use candid::{self, CandidType, Deserialize, Principal};
use cashier_macros::storable;
use serde::Serialize;

#[derive(CandidType, Debug, Clone)]
#[storable]
pub struct Gate {
    pub id: String,
    pub owner_id: String,
    pub gate_type: GateType,
    pub key: GateKey,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub struct NewGate {
    pub owner_id: String,
    pub gate_type: GateType,
    pub key: GateKey,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub struct UpdateGate {
    pub id: String,
    pub owner_id: Option<String>,
    pub gate_type: Option<GateType>,
    pub key: Option<GateKey>,
}

#[derive(CandidType, Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
#[storable]
pub struct GateUser {
    pub gate_id: String,
    pub user_id: Principal,
}

#[derive(CandidType, Debug, Clone)]
#[storable]
pub struct GateUserStatus {
    pub gate_id: String,
    pub user_id: Principal,
    pub status: GateStatus,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub struct GateForCaller {
    pub gate: Gate,
    pub gate_user_status: Option<GateUserStatus>,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
pub enum GateStatus {
    Open,
    Closed,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
pub enum GateType {
    Password,
    XFollowing,
    TelegramGroup,
    DiscordServer,
    Nft,
    Composite,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
pub enum GateKey {
    Password(String),
    XFollowing(String),
    TelegramGroup(String),
    DiscordServer(String),
    Nft(NftKey),
    Composite(CompositeKey),
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct NftKey {
    pub collection_id: String,
    pub token_id: String,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct CompositeKey {
    pub version: String,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
pub enum VerificationResult {
    Success,
    Failure(String),
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub struct OpenGateSuccessResult {
    pub gate: Gate,
    pub gate_user_status: GateUserStatus,
}

#[async_trait]
pub trait GateVerifier {
    /// Verifies the provided key against the gate's key.
    /// # Arguments
    /// * `key`: The key to be verified.
    /// # Returns
    /// * `Ok(VerificationResult)`: If the key is verified successfully.
    /// * `Err(String)`: If there is an error during verification.
    async fn verify(&self, key: GateKey) -> Result<VerificationResult, String>;
}
