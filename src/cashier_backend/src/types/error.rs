// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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

    // Fallback
    #[error("Unknown error: {0}")]
    UnknownError(String),
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
