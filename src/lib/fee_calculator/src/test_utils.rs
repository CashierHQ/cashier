// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Test utilities for fee_calculator crate

use candid::Nat;
use candid::Principal;
use cashier_backend_types::repository::common::{Asset, Wallet};
use cashier_backend_types::repository::intent::v1::{IntentType, TransferData};
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::{Link, LinkState, LinkType};
use cashier_backend_types::repository::transaction::v1::{
    FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Protocol,
    Transaction, TransactionState,
};

/// Create Link with configurable max_use_count
pub fn make_link(max_use: u64) -> Link {
    Link {
        id: "test".to_string(),
        state: LinkState::Active,
        title: "Test".to_string(),
        link_type: LinkType::SendTip,
        asset_info: vec![],
        creator: Principal::anonymous(),
        create_at: 0,
        link_use_action_counter: 0,
        link_use_action_max_count: max_use,
    }
}

/// Create Link with default max_use=1
pub fn make_link_default() -> Link {
    make_link(1)
}

/// Create Transfer Intent with specified amount
/// Sets intent_total_amount for fee calculation (required by treasury flow)
pub fn make_intent(amount: u64) -> Intent {
    Intent {
        r#type: IntentType::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(amount),
        }),
        intent_total_amount: Some(Nat::from(amount)),
        ..Default::default()
    }
}

/// Create single ICRC1 Transfer Transaction
pub fn make_icrc1_tx() -> Transaction {
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

/// Create ICRC2 Transaction pair (Approve + TransferFrom)
pub fn make_icrc2_txs() -> Vec<Transaction> {
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
