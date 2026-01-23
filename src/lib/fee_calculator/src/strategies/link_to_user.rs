// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;

use super::helpers::calc_outbound_fee;
use crate::traits::IntentFeeStrategy;
use crate::types::IntentFeeResult;

pub struct LinkToUserStrategy;

impl IntentFeeStrategy for LinkToUserStrategy {
    fn calculate(
        &self,
        _link: &Link,
        _intent: &Intent,
        _transactions: &[Transaction],
        network_fee: Nat,
    ) -> Result<IntentFeeResult, String> {
        // 0 inbound (link already has funds) + fee × 1 outbound
        let outbound_fee = calc_outbound_fee(1, &network_fee);

        // User receives - pays nothing
        Ok(IntentFeeResult {
            intent_total_network_fee: outbound_fee,
            intent_user_fee: Nat::from(0u64),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{make_intent, make_link_default};

    #[test]
    fn test_link_to_user_pays_nothing() {
        let strategy = LinkToUserStrategy;
        let intent = make_intent(1000);
        let link = make_link_default();
        let result = strategy
            .calculate(&link, &intent, &[], Nat::from(10u64))
            .unwrap();

        // User receives - pays nothing
        assert_eq!(result.intent_total_network_fee, Nat::from(10u64));
        assert_eq!(result.intent_user_fee, Nat::from(0u64));
    }
}
