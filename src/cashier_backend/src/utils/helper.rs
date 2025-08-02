// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_types::error::CanisterError;
use icrc_ledger_types::icrc1::{account::Subaccount, transfer::Memo};
use serde_bytes::ByteBuf;
use uuid::Uuid;

/// Converts a string UUID to a 32-byte Subaccount format
///
/// This function takes a string UUID and converts it to a 32-byte array where:
/// - The first 16 bytes contain the UUID bytes
/// - The remaining 16 bytes are zeros (for padding)
///
/// This is used specifically for generating subaccounts from link IDs
/// to maintain consistent addressing across the system.
// apply for link id only
pub fn to_subaccount(id: &str) -> Result<Subaccount, String> {
    let uuid = match Uuid::parse_str(id) {
        Ok(u) => u,
        Err(_) => return Err("Invalid UUID format".to_string()),
    };
    let uuid_bytes = uuid.as_bytes();

    // DO NOT CHANGE THE ORDER OF THE BYTES
    let mut subaccount: Subaccount = [0; 32];
    subaccount[..16].copy_from_slice(&uuid_bytes[0..]);

    Ok(subaccount)
}

/// Converts a string UUID to a 32-byte Memo format for ICRC transactions
///
/// This function takes a string UUID and converts it to a 32-byte memo where:
/// - The first 16 bytes contain the UUID bytes
/// - The remaining 16 bytes are zeros (for padding)
///
/// Used for creating memos in ICRC1 transfers and ICRC2 transfer_from operations
/// to maintain traceability of transactions.
pub fn to_memo(id: &str) -> Result<Memo, String> {
    let uuid = match Uuid::parse_str(id) {
        Ok(u) => u,
        Err(_) => return Err("Invalid UUID format".to_string()),
    };
    let uuid_bytes = uuid.as_bytes();

    let mut memo: [u8; 32] = [0; 32];
    memo[..16].copy_from_slice(&uuid_bytes[0..]);

    Ok(Memo(ByteBuf::from(memo.to_vec())))
}

pub fn convert_nat_to_u64(nat_value: &Nat) -> Result<u64, CanisterError> {
    nat_value
        .0
        .clone()
        .try_into()
        .map_err(|_| CanisterError::ValidationErrors("Value too large to fit in u64".to_string()))
}
