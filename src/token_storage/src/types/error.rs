// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use ic_cdk::call::{CallFailed, CandidDecodeFailed};
use serde::Deserialize;
use thiserror::Error;

#[derive(Clone, Debug, CandidType, Deserialize, Error)]
pub enum CanisterError {
    #[error("Candid decode failed: {0}")]
    CandidDecodeFailed(String),

    #[error("Call failed: {0}")]
    UnboundedError(String),
}

impl From<CandidDecodeFailed> for CanisterError {
    fn from(err: CandidDecodeFailed) -> Self {
        CanisterError::CandidDecodeFailed(format!("Candid decode failed: {}", err))
    }
}

impl From<CallFailed> for CanisterError {
    fn from(err: CallFailed) -> Self {
        CanisterError::UnboundedError(format!("Call failed: {}", err))
    }
}
