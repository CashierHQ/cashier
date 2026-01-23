// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol, Transaction};

/// Calculate inbound fee from transactions (source of truth)
/// Counts actual transaction types to determine fee multiplier
/// - ICRC1: 1 tx (Icrc1Transfer) = 1 fee
/// - ICRC2: 2 txs (Icrc2Approve + Icrc2TransferFrom) = 2 fees
/// # Arguments
/// * `transactions` - The transactions for this intent
/// * `network_fee` - The base network fee
/// # Returns
/// * `Nat` - The calculated inbound network fee
pub fn calc_inbound_fee(transactions: &[Transaction], network_fee: &Nat) -> Nat {
    let tx_count = transactions
        .iter()
        .filter(|tx| {
            matches!(
                &tx.protocol,
                Protocol::IC(IcTransaction::Icrc1Transfer(_))
                    | Protocol::IC(IcTransaction::Icrc2Approve(_))
                    | Protocol::IC(IcTransaction::Icrc2TransferFrom(_))
            )
        })
        .count() as u64;

    network_fee.clone() * Nat::from(tx_count)
}

/// Calculate outbound fee (link → external wallet)
/// Outbound always uses ICRC1 (no approval needed), so fee = network_fee × count
/// # Arguments
/// * `count` - Number of outbound transfers (typically max_use for CreatorToLink, 1 otherwise)
/// * `network_fee` - The base network fee
/// # Returns
/// * `Nat` - The calculated outbound network fee
pub fn calc_outbound_fee(count: u64, network_fee: &Nat) -> Nat {
    network_fee.clone() * Nat::from(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{make_icrc1_tx, make_icrc2_txs};

    #[test]
    fn test_calc_inbound_fee_icrc1() {
        let txs = vec![make_icrc1_tx()];
        let fee = Nat::from(10u64);
        assert_eq!(calc_inbound_fee(&txs, &fee), Nat::from(10u64)); // 1 tx
    }

    #[test]
    fn test_calc_inbound_fee_icrc2() {
        let txs = make_icrc2_txs();
        let fee = Nat::from(10u64);
        assert_eq!(calc_inbound_fee(&txs, &fee), Nat::from(20u64)); // 2 txs
    }

    #[test]
    fn test_calc_inbound_fee_empty() {
        let txs: Vec<Transaction> = vec![];
        let fee = Nat::from(10u64);
        assert_eq!(calc_inbound_fee(&txs, &fee), Nat::from(0u64)); // 0 txs
    }

    #[test]
    fn test_calc_outbound_fee_single() {
        let fee = Nat::from(10u64);
        assert_eq!(calc_outbound_fee(1, &fee), Nat::from(10u64));
    }

    #[test]
    fn test_calc_outbound_fee_multi() {
        let fee = Nat::from(10u64);
        assert_eq!(calc_outbound_fee(5, &fee), Nat::from(50u64));
    }

    #[test]
    fn test_calc_outbound_fee_zero() {
        let fee = Nat::from(10u64);
        assert_eq!(calc_outbound_fee(0, &fee), Nat::from(0u64));
    }
}
