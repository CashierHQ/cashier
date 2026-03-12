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

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::{
        asset::v1::Asset,
        common::Wallet,
        transaction::v1::{
            FromCallType, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, TransactionState,
        },
    };

    fn fixture_of_icrc1_transfer_transaction(ts: Option<u64>) -> Transaction {
        Transaction {
            id: "tx_icrc1".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(100u64),
                memo: None,
                ts,
            })),
            start_ts: None,
        }
    }

    fn fixture_of_icrc2_approve_transaction(ts: Option<u64>) -> Transaction {
        Transaction {
            id: "tx_icrc2_approve".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
                from: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(200u64),
                memo: None,
                ts,
            })),
            start_ts: None,
        }
    }

    fn fixture_of_icrc2_transfer_from_transaction(ts: Option<u64>) -> Transaction {
        Transaction {
            id: "tx_icrc2_transfer_from".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(300u64),
                memo: None,
                ts,
            })),
            start_ts: None,
        }
    }

    #[test]
    fn it_should_fail_update_icrc1_transfer_ts_due_to_ts_within_time_window() {
        // Arrange
        let current_ts = ICRC_TRANSACTION_TIME_WINDOW_NANOSECS + 1_000u64;
        let old_ts = current_ts - ICRC_TRANSACTION_TIME_WINDOW_NANOSECS;
        let mut tx = fixture_of_icrc1_transfer_transaction(Some(old_ts));

        // Act
        update_transaction_with_current_ts(&mut tx, current_ts);

        // Assert
        match tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref t)) => assert_eq!(t.ts, Some(old_ts)),
            _ => panic!("Expected Icrc1Transfer"),
        }
    }

    #[test]
    fn it_should_fail_update_icrc2_approve_ts_due_to_missing_created_at_time() {
        // Arrange
        let current_ts = ICRC_TRANSACTION_TIME_WINDOW_NANOSECS + 1_000u64;
        let mut tx = fixture_of_icrc2_approve_transaction(None);

        // Act
        update_transaction_with_current_ts(&mut tx, current_ts);

        // Assert
        match tx.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref t)) => assert_eq!(t.ts, None),
            _ => panic!("Expected Icrc2Approve"),
        }
    }

    #[test]
    fn it_should_fail_update_icrc2_transfer_from_ts_due_to_unsupported_transaction_variant() {
        // Arrange
        let current_ts = ICRC_TRANSACTION_TIME_WINDOW_NANOSECS + 1_000u64;
        let old_ts = current_ts - ICRC_TRANSACTION_TIME_WINDOW_NANOSECS - 1;
        let mut tx = fixture_of_icrc2_transfer_from_transaction(Some(old_ts));

        // Act
        update_transaction_with_current_ts(&mut tx, current_ts);

        // Assert
        match tx.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref t)) => assert_eq!(t.ts, Some(old_ts)),
            _ => panic!("Expected Icrc2TransferFrom"),
        }
    }

    #[test]
    fn it_should_succeed_update_icrc1_transfer_ts() {
        // Arrange
        let current_ts = ICRC_TRANSACTION_TIME_WINDOW_NANOSECS + 1_000u64;
        let old_ts = current_ts - ICRC_TRANSACTION_TIME_WINDOW_NANOSECS - 1;
        let mut tx = fixture_of_icrc1_transfer_transaction(Some(old_ts));

        // Act
        update_transaction_with_current_ts(&mut tx, current_ts);

        // Assert
        match tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref t)) => assert_eq!(t.ts, Some(current_ts)),
            _ => panic!("Expected Icrc1Transfer"),
        }
    }

    #[test]
    fn it_should_succeed_update_icrc2_approve_ts() {
        // Arrange
        let current_ts = ICRC_TRANSACTION_TIME_WINDOW_NANOSECS + 1_000u64;
        let old_ts = current_ts - ICRC_TRANSACTION_TIME_WINDOW_NANOSECS - 1;
        let mut tx = fixture_of_icrc2_approve_transaction(Some(old_ts));

        // Act
        update_transaction_with_current_ts(&mut tx, current_ts);

        // Assert
        match tx.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref t)) => assert_eq!(t.ts, Some(current_ts)),
            _ => panic!("Expected Icrc2Approve"),
        }
    }
}
