// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use icrc_ledger_types::icrc1::{
    account::{Account, Subaccount},
    transfer::Memo,
};
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

/// Converts a string UUID to a 16-byte Memo format for ICRC transactions
///
/// This function takes a string UUID and converts it to a memo containing exactly
/// the UUID's 16 bytes, with no padding. Some ICRC ledgers cap the memo field at
/// 16 bytes (rather than the ICRC-1 default of 32), so the memo must not exceed that.
///
/// Used for creating memos in ICRC1 transfers, ICRC2 approve, and ICRC2
/// transfer_from operations to maintain traceability of transactions.
pub fn to_memo(id: &str) -> Result<Memo, String> {
    let uuid = match Uuid::parse_str(id) {
        Ok(u) => u,
        Err(_) => return Err("Invalid UUID format".to_string()),
    };
    let uuid_bytes = uuid.as_bytes();

    Ok(Memo(ByteBuf::from(uuid_bytes.to_vec())))
}

/// Converts a Nat value to u64, returning an error if the value is too large
/// # Arguments
/// * `nat_value` - The Nat value to convert
/// # Returns
/// * `Result<u64, String>` - The resulting u64 value or an error if the conversion fails
pub fn convert_nat_to_u64(nat_value: &Nat) -> Result<u64, String> {
    nat_value
        .0
        .clone()
        .try_into()
        .map_err(|_| "Value too large to fit in u64".to_string())
}

/// Converts a transaction ID string (UUID format) to a nonce byte vector
/// This is used for setting the nonce in ICRC-1 and ICRC-2 token transfers
/// # Arguments
/// * `tx_id` - The transaction ID in string format
/// # Returns
/// * `Result<Vec<u8>, String>` - The resulting nonce as a byte vector or an error if the conversion fails
pub fn nonce_from_tx_id(tx_id: &str) -> Result<Vec<u8>, String> {
    Uuid::parse_str(tx_id)
        .map_err(|e| format!("Invalid uuid: {e}"))
        .map(|u| u.as_bytes().to_vec())
}

/// Generates a unique ICRC account for a link using its ID and the canister's principal.
///
/// The account is derived by combining the canister's principal as the owner with a
/// subaccount generated from the link ID. This creates a deterministic address for
/// each link that can be used for token transfers and balance queries.
///
/// # Arguments
///
/// * `link_id` - The link's unique identifier (UUID string format)
/// * `canister_id` - The principal of the canister that owns the link account
///
/// # Returns
///
/// Returns an `Account` with the canister as owner and derived subaccount.
///
/// # Errors
///
/// Returns an error string if:
/// * The `link_id` is not a valid UUID format
/// * Subaccount derivation fails
pub fn get_link_account(link_id: &str, canister_id: Principal) -> Result<Account, String> {
    Ok(Account {
        owner: canister_id,
        subaccount: Some(to_subaccount(link_id)?),
    })
}

/// Generates an external ICRC account representation for a link.
///
/// This function creates an account suitable for use with ICRC token services
/// in inter-canister calls. It derives the subaccount from the link ID and
/// combines it with the canister principal.
///
/// # Arguments
///
/// * `link_id` - The link's unique identifier (UUID string format)
/// * `canister_id` - The principal of the canister that owns the account
///
/// # Returns
///
/// Returns an `Account` with the canister as owner and derived subaccount.
///
/// # Errors
///
/// Returns an error string if:
/// * The `link_id` is not a valid UUID format
/// * Subaccount derivation fails
pub fn get_link_ext_account(link_id: &str, canister_id: Principal) -> Result<Account, String> {
    let subaccount = to_subaccount(link_id)?;
    Ok(Account {
        owner: canister_id,
        subaccount: Some(subaccount),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_produce_a_16_byte_memo_from_a_uuid() {
        let id = "550e8400-e29b-41d4-a716-446655440000";
        let uuid = Uuid::parse_str(id).unwrap();

        let memo = to_memo(id).unwrap();

        assert_eq!(memo.0.len(), 16);
        assert_eq!(memo.0.as_slice(), uuid.as_bytes().as_slice());
    }

    #[test]
    fn it_should_fail_to_memo_for_an_invalid_uuid() {
        let result = to_memo("not-a-uuid");

        assert_eq!(result, Err("Invalid UUID format".to_string()));
    }

    #[test]
    fn it_should_produce_different_memos_for_different_uuids() {
        let a = to_memo("550e8400-e29b-41d4-a716-446655440000").unwrap();
        let b = to_memo("6ba7b810-9dad-11d1-80b4-00c04fd430c8").unwrap();

        assert_ne!(a.0, b.0);
    }
}
