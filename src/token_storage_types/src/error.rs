use candid::CandidType;
use serde::Deserialize;
use thiserror::Error;

#[derive(Clone, Debug, CandidType, Deserialize, Error)]
pub enum TokenStorageError {

    #[error("Auth error: {0}")]
    AuthError(String)

}