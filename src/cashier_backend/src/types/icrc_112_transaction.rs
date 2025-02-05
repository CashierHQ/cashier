use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Icrc112Request {
    pub canister_id: String,
    pub method: String,
    pub arg: String,
    pub nonce: Option<String>,
}

pub type ParallelRequests = Vec<Icrc112Request>;

pub type SequenceRequest = Vec<ParallelRequests>;

pub type Icrc112Requests = SequenceRequest;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CanisterCallResponse {
    pub content_map: String,
    pub certificate: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct SuccessResponse {
    pub result: CanisterCallResponse,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ErrorDetail {
    pub code: i32,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum IcrcXResponseItem {
    Success(SuccessResponse),
    Error(ErrorResponse),
}

pub type IcrcxResponses = Vec<Vec<IcrcXResponseItem>>;
