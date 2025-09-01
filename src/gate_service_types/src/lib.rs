use async_trait::async_trait;
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

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
/// The data structure for creating a new Gate
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
/// The data structure for updating an existing Gate
/// Fields:
/// * `id`: The unique identifier for the gate.
/// * `subject_id`: The ID of the object being gated (Links, Campaigns, MysteryBoxes, etc)
/// * `gate_type`: The type of the gate.
/// * `key`: The key associated with the gate.
pub struct UpdateGate {
    pub id: String,
    pub subject_id: Option<String>,
    pub gate_type: Option<GateType>,
    pub key: Option<GateKey>,
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
/// The gate type enum
pub enum GateType {
    Password,
    XFollowing,
    TelegramGroup,
    DiscordServer,
    Nft,
    Composite,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
/// The gate key enum
pub enum GateKey {
    Password(String),
    XFollowing(String),
    TelegramGroup(String),
    DiscordServer(String),
    Nft(NftKey),
    Composite(CompositeKey),
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
/// The data structure for an NFT key
/// Fields:
/// * `collection_id`: The ID of the NFT collection.
/// * `token_id`: The ID of the specific NFT token.
pub struct NftKey {
    pub collection_id: String,
    pub token_id: String,
}

#[derive(CandidType, Serialize, Deserialize, Debug, PartialEq, Clone)]
/// The data structure for a composite key (TBD)
/// Fields:
/// * `version`: The version of the composite key.
pub struct CompositeKey {
    pub version: String,
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
