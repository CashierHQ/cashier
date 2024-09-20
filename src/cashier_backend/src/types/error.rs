use candid::CandidType;
use serde::Deserialize;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum CanisterError {
    #[serde(rename = "AnonymousCall")]
    AnonymousCall,

    // Add other error types as needed
    #[serde(rename = "HandleLogicError")]
    HandleLogicError(String),

    #[serde(rename = "HandleApiError")]
    HandleApiError(String),
}
