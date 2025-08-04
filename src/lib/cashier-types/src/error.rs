// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use ic_cdk::call::{CallFailed, CandidDecodeFailed};
use serde::Deserialize;
use thiserror::Error;

#[derive(Clone, Debug, CandidType, Deserialize, Error)]
pub enum CanisterError {
    // Authentication/Authorization errors
    #[error("Anonymous call is not allowed")]
    AnonymousCall,

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    // Resource errors
    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Resource already exists: {0}")]
    AlreadyExists(String),

    // Input validation errors
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Invalid state transition from {from} to {to}")]
    InvalidStateTransition { from: String, to: String },

    #[error("Insufficient balance: available {available}, required {required}")]
    InsufficientBalance { available: u64, required: u64 },

    #[error("Failed to call method {method} on canister {canister_id}: {message}")]
    CanisterCallError {
        method: String,
        canister_id: String,
        message: String,
    },

    // Parsing errors
    #[error("Failed to parse account address: {0}")]
    ParseAccountError(String),

    #[error("Failed to parse principal: {0}")]
    ParsePrincipalError(String),

    // Data handling errors
    #[error("Invalid data: {0}")]
    InvalidDataError(String),

    // Transaction errors
    #[error("Transaction timeout: {0}")]
    TransactionTimeout(String),

    #[error("Transaction dependencies not satisfied: {0}")]
    DependencyError(String),

    // Migration for legacy errors
    #[error("Logic error: {0}")]
    HandleLogicError(String),

    #[error("Validation error: {0}")]
    ValidationErrors(String),

    #[error("Call other canister failed {0}")]
    CallCanisterFailed(String),

    // Fallback
    #[error("Unknown error: {0}")]
    UnknownError(String),

    #[error("Multi errors: {0:?}")]
    BatchError(Vec<CanisterError>),

    #[error("Candid decode failed: {0}")]
    CandidDecodeFailed(String),

    #[error("Call failed: {0}")]
    UnboundedError(String),
}

impl CanisterError {
    pub fn not_found(resource: &str, id: &str) -> Self {
        Self::NotFound(format!("{resource} with id {id} not found"))
    }

    pub fn already_exists(resource: &str, id: &str) -> Self {
        Self::AlreadyExists(format!("{resource} with id {id} already exists"))
    }

    pub fn invalid_input(message: &str) -> Self {
        Self::InvalidInput(message.to_string())
    }

    pub fn unauthorized(message: &str) -> Self {
        Self::Unauthorized(message.to_string())
    }
}

// Implement From for common error conversions
impl From<String> for CanisterError {
    fn from(error: String) -> Self {
        CanisterError::UnknownError(error)
    }
}

impl From<&str> for CanisterError {
    fn from(error: &str) -> Self {
        CanisterError::UnknownError(error.to_string())
    }
}

impl From<CandidDecodeFailed> for CanisterError {
    fn from(err: CandidDecodeFailed) -> Self {
        CanisterError::CandidDecodeFailed(format!("Candid decode failed: {err}"))
    }
}

impl From<CallFailed> for CanisterError {
    fn from(err: CallFailed) -> Self {
        CanisterError::UnboundedError(format!("Call failed: {err}"))
    }
}
