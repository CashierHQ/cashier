// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use super::error::CanisterError;

// Add this to the error.rs file
pub type CanisterResult<T> = Result<T, CanisterError>;
