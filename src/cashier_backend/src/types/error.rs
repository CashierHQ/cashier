use std::fmt;

use candid::CandidType;
use ic_cdk::api::call::RejectionCode;
use serde::Deserialize;
use thiserror::Error;

#[derive(Clone, Debug, CandidType, Deserialize, Error)]
pub enum CanisterError {
    #[error("Anonymous call is not allowed")]
    #[serde(rename = "AnonymousCall")]
    AnonymousCall,

    #[error("Logic error: {0}")]
    #[serde(rename = "HandleLogicError")]
    HandleLogicError(String),

    #[error("API error: {0}")]
    #[serde(rename = "HandleApiError")]
    HandleApiError(String),

    #[error("Validation error: {0}")]
    ValidationErrors(String),

    #[error("Failed to parse account address: {0}")]
    ParseAccountError(String),

    #[error("Failed to parse principal: {0}")]
    ParsePrincipalError(String),

    #[error("Failed to call method {0} on canister {1} : Reject code {2}, {3}")]
    CanisterCallRejectError(String, String, DisplayRejectionCode, String),

    #[error("Failed to call method {0} on canister {1} : {2}")]
    CanisterCallError(String, String, String),

    #[error("Canister not found: {0}")]
    NotFound(String),

    #[error("Unknown error: {0}")]
    UnknownError(String),

    #[error("Invalid data: {0}")]
    InvalidDataError(String),
}

#[derive(Clone, Debug, CandidType, Deserialize, Error)]
pub struct DisplayRejectionCode(pub RejectionCode);

impl fmt::Display for DisplayRejectionCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self.0)
    }
}
