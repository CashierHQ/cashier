// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;

use super::helpers::{calc_inbound_fee, get_intent_amount};
use crate::traits::IntentFeeStrategy;
use crate::types::IntentFeeResult;

pub struct UserToLinkStrategy;

impl IntentFeeStrategy for UserToLinkStrategy {
    fn calculate(&self, intent: &Intent, _link: &Link, network_fee: Nat) -> IntentFeeResult {
        let amount = get_intent_amount(intent);

        // Inbound: smart detect ICRC1/ICRC2
        // Outbound: fee * 1 (single claim by creator)
        let inbound_fee = calc_inbound_fee(intent, &network_fee);
        let outbound_fee = network_fee;
        let net_fee = inbound_fee + outbound_fee;

        // User pays: network fee (amount is their contribution)
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
    fn test_user_to_link_pays_network_fees() {
        let strategy = UserToLinkStrategy;
        let intent = make_intent(1000);
        let link = make_link();
        let result = strategy.calculate(&intent, &link, Nat::from(10u64));

        // inbound=10, outbound=10, net_fee=20
        assert_eq!(result.intent_total_amount, Nat::from(1000u64));
        assert_eq!(result.intent_total_network_fee, Nat::from(20u64));
        assert_eq!(result.intent_user_fee, Nat::from(20u64));
    }
}
