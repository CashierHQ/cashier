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
pub fn to_subaccount(id: &str) -> Subaccount {
    let uuid = Uuid::parse_str(&id).expect("Invalid UUID format");
    let uuid_bytes = uuid.as_bytes();

    // DO NOT CHANGE THE ORDER OF THE BYTES
    let mut subaccount: Subaccount = [0; 32];
    subaccount[..16].copy_from_slice(&uuid_bytes[0..]);

    subaccount
}

/// Converts a string UUID to a 32-byte Memo format for ICRC transactions
/// 
/// This function takes a string UUID and converts it to a 32-byte memo where:
/// - The first 16 bytes contain the UUID bytes
/// - The remaining 16 bytes are zeros (for padding)
/// 
/// Used for creating memos in ICRC1 transfers and ICRC2 transfer_from operations
/// to maintain traceability of transactions.
pub fn to_memo(id: &str) -> Memo {
    let uuid = Uuid::parse_str(&id).expect("Invalid UUID format");
    let uuid_bytes = uuid.as_bytes();

    let mut memo: [u8; 32] = [0; 32];
    memo[..16].copy_from_slice(&uuid_bytes[0..]);

    Memo(ByteBuf::from(memo.to_vec()))
}
