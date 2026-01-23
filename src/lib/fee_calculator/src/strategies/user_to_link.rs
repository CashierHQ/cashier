// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;

use super::helpers::{calc_inbound_fee, calc_outbound_fee};
use crate::traits::IntentFeeStrategy;
use crate::types::IntentFeeResult;

pub struct UserToLinkStrategy;

impl IntentFeeStrategy for UserToLinkStrategy {
    fn calculate(
        &self,
        _link: &Link,
        _intent: &Intent,
        transactions: &[Transaction],
        network_fee: Nat,
    ) -> Result<IntentFeeResult, String> {
        // Inbound fee from transactions (source of truth)
        // Outbound: fee × 1 (single claim by creator)
        let inbound_fee = calc_inbound_fee(transactions, &network_fee);
        let outbound_fee = calc_outbound_fee(1, &network_fee);
        let net_fee = inbound_fee + outbound_fee;

        // User pays: network fee (amount is their contribution)
        Ok(IntentFeeResult {
            intent_total_network_fee: net_fee.clone(),
            intent_user_fee: net_fee,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{make_icrc1_tx, make_icrc2_txs, make_intent, make_link_default};

    #[test]
    fn test_user_to_link_icrc1() {
        let strategy = UserToLinkStrategy;
        let intent = make_intent(1000);
        let link = make_link_default();
        let txs = vec![make_icrc1_tx()];
        let result = strategy
            .calculate(&link, &intent, &txs, Nat::from(10u64))
            .unwrap();

        // inbound=10, outbound=10, net_fee=20
        assert_eq!(result.intent_total_network_fee, Nat::from(20u64));
        assert_eq!(result.intent_user_fee, Nat::from(20u64));
    }

    #[test]
    fn test_user_to_link_icrc2() {
        let strategy = UserToLinkStrategy;
        let intent = make_intent(1000);
        let link = make_link_default();
        let txs = make_icrc2_txs();
        let result = strategy
            .calculate(&link, &intent, &txs, Nat::from(10u64))
            .unwrap();

        // inbound=20 (2 txs), outbound=10, net_fee=30
        assert_eq!(result.intent_total_network_fee, Nat::from(30u64));
        assert_eq!(result.intent_user_fee, Nat::from(30u64));
    }
}
