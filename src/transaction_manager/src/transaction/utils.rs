// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol, Transaction};
use cashier_common::constant::ICRC_TRANSACTION_TIME_WINDOW_NANOSECS;

/// Updates the timestamp of ICRC transactions if they are older than the defined time window.
/// # Arguments
/// * `transaction` - A mutable reference to the Transaction to be updated.
/// * `current_ts` - The current timestamp in nanoseconds.
pub fn update_transaction_with_current_ts(transaction: &mut Transaction, current_ts: u64) {
    match transaction.protocol {
        Protocol::IC(IcTransaction::Icrc1Transfer(ref mut tx_transfer)) => {
            if let Some(tx_ts) = tx_transfer.ts
                && (current_ts - tx_ts) > ICRC_TRANSACTION_TIME_WINDOW_NANOSECS
            {
                tx_transfer.ts = Some(current_ts);
            }
        }
        Protocol::IC(IcTransaction::Icrc2Approve(ref mut tx_approve)) => {
            if let Some(tx_ts) = tx_approve.ts
                && (current_ts - tx_ts) > ICRC_TRANSACTION_TIME_WINDOW_NANOSECS
            {
                tx_approve.ts = Some(current_ts);
            }
        }
        _ => {}
    }
}
