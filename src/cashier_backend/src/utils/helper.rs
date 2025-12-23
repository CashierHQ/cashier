// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::error::CanisterError;

/// Converts a Nat value to u64, returning an error if the value is too large
/// # Arguments
/// * `nat_value` - The Nat value to convert
/// # Returns
/// * `Result<u64, CanisterError>` - The resulting u64 value or an error if the conversion fails
pub fn convert_nat_to_u64(nat_value: &Nat) -> Result<u64, CanisterError> {
    nat_value
        .0
        .clone()
        .try_into()
        .map_err(|_| CanisterError::ValidationErrors("Value too large to fit in u64".to_string()))
}
