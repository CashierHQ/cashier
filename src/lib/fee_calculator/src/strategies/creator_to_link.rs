// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;

use super::helpers::{calc_inbound_fee, calc_outbound_fee};
use crate::traits::IntentFeeStrategy;
use crate::types::IntentFeeResult;

pub struct CreatorToLinkStrategy;

impl IntentFeeStrategy for CreatorToLinkStrategy {
    fn calculate(
        &self,
        link: &Link,
        _intent: &Intent,
        transactions: &[Transaction],
        network_fee: Nat,
    ) -> Result<IntentFeeResult, String> {
        let max_use = link.link_use_action_max_count;

        // Inbound fee from transactions (source of truth)
        // Outbound: fee × max_use (for future claims)
        let inbound_fee = calc_inbound_fee(transactions, &network_fee);
        let outbound_fee = calc_outbound_fee(max_use, &network_fee);
        let net_fee = inbound_fee + outbound_fee;

        // User pays: network fees (inbound + outbound)
        Ok(IntentFeeResult {
            intent_total_network_fee: net_fee.clone(),
            intent_user_fee: net_fee,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{make_icrc1_tx, make_icrc2_txs, make_intent, make_link};

    #[test]
    fn test_creator_to_link_single_use_icrc1() {
        let strategy = CreatorToLinkStrategy;
        let intent = make_intent(1000);
        let link = make_link(1);
        let txs = vec![make_icrc1_tx()];
        let result = strategy
            .calculate(&link, &intent, &txs, Nat::from(10u64))
            .unwrap();

        // inbound=10, outbound=10×1=10, net_fee=20
        assert_eq!(result.intent_total_network_fee, Nat::from(20u64));
        assert_eq!(result.intent_user_fee, Nat::from(20u64));
    }

    #[test]
    fn test_creator_to_link_multi_use_icrc1() {
        let strategy = CreatorToLinkStrategy;
        let link = make_link(5);
        let intent = make_intent(5000);
        let txs = vec![make_icrc1_tx()];
        let result = strategy
            .calculate(&link, &intent, &txs, Nat::from(10u64))
            .unwrap();

        // inbound=10, outbound=10×5=50, net_fee=60
        assert_eq!(result.intent_total_network_fee, Nat::from(60u64));
        assert_eq!(result.intent_user_fee, Nat::from(60u64));
    }

    #[test]
    fn test_creator_to_link_multi_use_icrc2() {
        let strategy = CreatorToLinkStrategy;
        let intent = make_intent(5000);
        let link = make_link(5);
        let txs = make_icrc2_txs();
        let result = strategy
            .calculate(&link, &intent, &txs, Nat::from(10u64))
            .unwrap();

        // inbound=20 (2 txs), outbound=10×5=50, net_fee=70
        assert_eq!(result.intent_total_network_fee, Nat::from(70u64));
        assert_eq!(result.intent_user_fee, Nat::from(70u64));
    }
}
