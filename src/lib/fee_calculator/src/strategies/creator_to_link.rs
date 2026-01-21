// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;

use super::helpers::{calc_inbound_fee, calc_outbound_fee, get_intent_amount};
use crate::traits::IntentFeeStrategy;
use crate::types::IntentFeeResult;

pub struct CreatorToLinkStrategy;

impl IntentFeeStrategy for CreatorToLinkStrategy {
    fn calculate(
        &self,
        link: &Link,
        intent: &Intent,
        transactions: &[Transaction],
        network_fee: Nat,
    ) -> IntentFeeResult {
        // intent_total_amount = amount_per_link_use_action × max_use (already set in intent)
        let amount = get_intent_amount(intent);
        let max_use = link.link_use_action_max_count;

        // Inbound fee from transactions (source of truth)
        // Outbound: fee × max_use (for future claims)
        let inbound_fee = calc_inbound_fee(transactions, &network_fee);
        let outbound_fee = calc_outbound_fee(max_use, &network_fee);
        let net_fee = inbound_fee + outbound_fee;

        // User pays: network fees (inbound + outbound)
        IntentFeeResult {
            intent_total_amount: amount,
            intent_total_network_fee: net_fee.clone(),
            intent_user_fee: net_fee,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Principal;
    use cashier_backend_types::repository::common::{Asset, Wallet};
    use cashier_backend_types::repository::intent::v1::{IntentType, TransferData};
    use cashier_backend_types::repository::link::v1::{LinkState, LinkType};
    use cashier_backend_types::repository::transaction::v1::{
        FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Protocol,
        TransactionState,
    };

    fn make_link(max_use: u64) -> Link {
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

    fn make_intent(amount: u64) -> Intent {
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
    fn test_creator_to_link_single_use_icrc1() {
        let strategy = CreatorToLinkStrategy;
        // intent amount = amount_per_use × max_use = 1000 × 1 = 1000
        let intent = make_intent(1000);
        let link = make_link(1);
        let txs = vec![make_icrc1_tx()];
        let result = strategy.calculate(&link, &intent, &txs, Nat::from(10u64));

        // inbound=10, outbound=10×1=10, net_fee=20
        assert_eq!(result.intent_total_amount, Nat::from(1000u64));
        assert_eq!(result.intent_total_network_fee, Nat::from(20u64));
        assert_eq!(result.intent_user_fee, Nat::from(20u64));
    }

    #[test]
    fn test_creator_to_link_multi_use_icrc1() {
        let strategy = CreatorToLinkStrategy;
        // intent amount = amount_per_use × max_use = 1000 × 5 = 5000
        let intent = make_intent(5000);
        let link = make_link(5);
        let txs = vec![make_icrc1_tx()];
        let result = strategy.calculate(&link, &intent, &txs, Nat::from(10u64));

        // inbound=10, outbound=10×5=50, net_fee=60
        assert_eq!(result.intent_total_amount, Nat::from(5000u64));
        assert_eq!(result.intent_total_network_fee, Nat::from(60u64));
        assert_eq!(result.intent_user_fee, Nat::from(60u64));
    }

    #[test]
    fn test_creator_to_link_multi_use_icrc2() {
        let strategy = CreatorToLinkStrategy;
        // intent amount = amount_per_use × max_use = 1000 × 5 = 5000
        let intent = make_intent(5000);
        let link = make_link(5);
        let txs = make_icrc2_txs();
        let result = strategy.calculate(&link, &intent, &txs, Nat::from(10u64));

        // inbound=20 (2 txs), outbound=10×5=50, net_fee=70
        assert_eq!(result.intent_total_amount, Nat::from(5000u64));
        assert_eq!(result.intent_total_network_fee, Nat::from(70u64));
        assert_eq!(result.intent_user_fee, Nat::from(70u64));
    }
}
