// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::fmt;

use candid::CandidType;
use ic_cdk::api::call::RejectionCode;
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

    // External service errors
    #[error(
        "Failed to call method {method} on canister {canister_id}: Reject code {code}, {message}"
    )]
    CanisterCallRejectError {
        method: String,
        canister_id: String,
        code: DisplayRejectionCode,
        message: String,
    },

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
}

impl CanisterError {
    pub fn not_found(resource: &str, id: &str) -> Self {
        Self::NotFound(format!("{} with id {} not found", resource, id))
    }

    pub fn already_exists(resource: &str, id: &str) -> Self {
        Self::AlreadyExists(format!("{} with id {} already exists", resource, id))
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

#[derive(Clone, Debug, CandidType, Deserialize, Error)]
pub struct DisplayRejectionCode(pub RejectionCode);

impl fmt::Display for DisplayRejectionCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self.0)
    }
}
