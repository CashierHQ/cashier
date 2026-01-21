// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;

use super::helpers::{calc_outbound_fee, get_intent_amount};
use crate::traits::IntentFeeStrategy;
use crate::types::IntentFeeResult;

pub struct LinkToCreatorStrategy;

impl IntentFeeStrategy for LinkToCreatorStrategy {
    fn calculate(
        &self,
        _link: &Link,
        intent: &Intent,
        _transactions: &[Transaction],
        network_fee: Nat,
    ) -> IntentFeeResult {
        let amount = get_intent_amount(intent);

        // 0 inbound (link already has funds) + fee × 1 outbound
        let outbound_fee = calc_outbound_fee(1, &network_fee);

        // Creator pays network fee on withdraw
        IntentFeeResult {
            intent_total_amount: amount,
            intent_total_network_fee: outbound_fee.clone(),
            intent_user_fee: outbound_fee,
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

    fn make_link() -> Link {
        Link {
            id: "test".to_string(),
            state: LinkState::Active,
            title: "Test".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![],
            creator: Principal::anonymous(),
            create_at: 0,
            link_use_action_counter: 0,
            link_use_action_max_count: 1,
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

    #[test]
    fn test_link_to_creator_pays_network_fee() {
        let strategy = LinkToCreatorStrategy;
        let intent = make_intent(1000);
        let link = make_link();
        let result = strategy.calculate(&link, &intent, &[], Nat::from(10u64));

        // Creator pays network fee on withdraw
        assert_eq!(result.intent_total_amount, Nat::from(1000u64));
        assert_eq!(result.intent_total_network_fee, Nat::from(10u64));
        assert_eq!(result.intent_user_fee, Nat::from(10u64));
    }
}
