// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;

use super::helpers::calc_inbound_fee;
use crate::traits::IntentFeeStrategy;
use crate::types::IntentFeeResult;

pub struct CreatorToTreasuryStrategy;

impl IntentFeeStrategy for CreatorToTreasuryStrategy {
    fn calculate(
        &self,
        _link: &Link,
        intent: &Intent,
        transactions: &[Transaction],
        network_fee: Nat,
    ) -> Result<IntentFeeResult, String> {
        // intent total amount alread set went created
        // intent_total_amount = link creation fee
        let amount = intent
            .intent_total_amount
            .clone()
            .ok_or("intent_total_amount is required for treasury flow")?;

        // Inbound fee from transactions (source of truth)
        let inbound_fee = calc_inbound_fee(transactions, &network_fee);

        // User pays: amount + network fee (treasury is special case)
        let user_fee = amount + inbound_fee.clone();

        Ok(IntentFeeResult {
            intent_total_network_fee: inbound_fee,
            intent_user_fee: user_fee,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{make_icrc1_tx, make_icrc2_txs, make_intent, make_link_default};

    #[test]
    fn test_creator_to_treasury_icrc1() {
        let strategy = CreatorToTreasuryStrategy;
        let intent = make_intent(1000);
        let link = make_link_default();
        let txs = vec![make_icrc1_tx()];
        let result = strategy
            .calculate(&link, &intent, &txs, Nat::from(10u64))
            .unwrap();

        // User pays: amount (1000) + net_fee (10) = 1010
        assert_eq!(result.intent_total_network_fee, Nat::from(10u64));
        assert_eq!(result.intent_user_fee, Nat::from(1010u64));
    }

    #[test]
    fn test_creator_to_treasury_icrc2() {
        let strategy = CreatorToTreasuryStrategy;
        let intent = make_intent(1000);
        let link = make_link_default();
        let txs = make_icrc2_txs();
        let result = strategy
            .calculate(&link, &intent, &txs, Nat::from(10u64))
            .unwrap();

        // User pays: amount (1000) + net_fee (20) = 1020
        assert_eq!(result.intent_total_network_fee, Nat::from(20u64));
        assert_eq!(result.intent_user_fee, Nat::from(1020u64));
    }
}
