use candid::{self, CandidType, Deserialize};
use serde::Serialize;
use thiserror::Error;

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, Error, PartialEq)]
pub enum GateServiceError {
    #[error("Gate not found")]
    NotFound,
    #[error("Unauthorized access")]
    Unauthorized,
    #[error("Failed to add gate {0}")]
    AddFailed(String),
    #[error("Failed to open gate {0}")]
    OpenFailed(String),
    #[error("Hashing password failed {0}")]
    HashingFailed(String),
    #[error("Data repository error {0}")]
    RepositoryError(String),
    #[error("Invalid key type {0}")]
    InvalidKeyType(String),
    #[error("Unsupported gate type {0}")]
    UnsupportedGateType(String),
    #[error("Key verification failed {0}")]
    KeyVerificationFailed(String),
}
