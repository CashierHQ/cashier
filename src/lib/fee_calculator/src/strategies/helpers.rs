// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v1::IntentType;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol, Transaction};

/// Extract amount from intent
/// # Arguments
/// * `intent` - The intent to extract amount from
/// # Returns
/// * `Nat` - The amount specified in the intent
pub fn get_intent_amount(intent: &Intent) -> Nat {
    match &intent.r#type {
        IntentType::Transfer(data) => data.amount.clone(),
        IntentType::TransferFrom(data) => data.amount.clone(),
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_backend_types::repository::common::{Asset, Wallet};
    use cashier_backend_types::repository::intent::v1::{TransferData, TransferFromData};
    use cashier_backend_types::repository::transaction::v1::{
        FromCallType, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, TransactionState,
    };

    fn make_transfer_intent(amount: u64) -> Intent {
        Intent {
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(amount),
            }),
            ..Default::default()
        }
    }

    fn make_transfer_from_intent(amount: u64) -> Intent {
        Intent {
            r#type: IntentType::TransferFrom(TransferFromData {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(amount),
                actual_amount: None,
                approve_amount: None,
            }),
            ..Default::default()
        }
    }

    fn make_icrc1_tx() -> Transaction {
        Transaction {
            id: "tx1".to_string(),
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
                ts: None,
            })),
            start_ts: None,
        }
    }

    fn make_icrc2_txs() -> Vec<Transaction> {
        vec![
            Transaction {
                id: "tx1".to_string(),
                created_at: 0,
                state: TransactionState::Created,
                dependency: None,
                group: 0,
                from_call_type: FromCallType::Wallet,
                protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
                    from: Wallet::default(),
                    spender: Wallet::default(),
                    asset: Asset::default(),
                    amount: Nat::from(100u64),
                    memo: None,
                    ts: None,
                })),
                start_ts: None,
            },
            Transaction {
                id: "tx2".to_string(),
                created_at: 0,
                state: TransactionState::Created,
                dependency: None,
                group: 0,
                from_call_type: FromCallType::Wallet,
                protocol: Protocol::IC(IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
                    from: Wallet::default(),
                    to: Wallet::default(),
                    spender: Wallet::default(),
                    asset: Asset::default(),
                    amount: Nat::from(100u64),
                    memo: None,
                    ts: None,
                })),
                start_ts: None,
            },
        ]
    }

    #[test]
    fn test_get_intent_amount_transfer() {
        let intent = make_transfer_intent(1000);
        assert_eq!(get_intent_amount(&intent), Nat::from(1000u64));
    }

    #[test]
    fn test_get_intent_amount_transfer_from() {
        let intent = make_transfer_from_intent(500);
        assert_eq!(get_intent_amount(&intent), Nat::from(500u64));
    }

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
}
