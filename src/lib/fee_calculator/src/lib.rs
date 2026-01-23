// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Intent Fee Calculator
//!
//! Takes existing intent + link + transactions, auto-detects flow, calculates:
//! - intent_total_amount
//! - intent_total_network_fee
//! - intent_user_fee

mod flow_detector;
mod strategies;
mod traits;
mod types;

#[cfg(test)]
pub(crate) mod test_utils;

pub use strategies::calc_outbound_fee;
pub use traits::IntentFeeStrategy;
pub use types::{IntentFeeResult, IntentFlow};

use candid::{Nat, Principal};
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use cashier_backend_types::repository::transaction::v1::Transaction;
use cashier_backend_types::repository::{asset_info::AssetInfo, common::Asset};
use cashier_common::constant::{CREATE_LINK_FEE, ICP_CANISTER_PRINCIPAL};
use flow_detector::detect_flow;
use std::collections::HashMap;
use strategies::get_strategy;

/// Calculate intent fees from existing intent
///
/// # Arguments
/// * `link` - The link (has creator + max_use_count)
/// * `intent` - The created intent (has task + amount)
/// * `transactions` - The transactions for this intent (source of truth for ICRC1/ICRC2)
/// * `caller` - Who initiated the action
/// * `network_fee` - Token network fee
pub fn calculate_intent_fees(
    link: &Link,
    intent: &Intent,
    transactions: &[Transaction],
    caller: Principal,
    network_fee: Nat,
) -> Result<IntentFeeResult, String> {
    let flow = detect_flow(intent, link, caller);
    let strategy = get_strategy(flow);
    strategy.calculate(link, intent, transactions, network_fee)
}

/// Calculate the token balance required for the link
/// # Arguments
/// * `asset_info` - A vector of AssetInfo associated with the link
/// * `fee_map` - A map of token principal to its corresponding fee
/// * `max_use_count` - The maximum number of times the link can be used
/// # Returns
/// * `HashMap<Principal, Nat>` - A map of token principal to the total balance required for the link
pub fn calculate_link_balance_map(
    asset_info: &[AssetInfo],
    fee_map: &HashMap<Principal, Nat>,
    max_use_count: u64,
) -> HashMap<Principal, Nat> {
    let mut balance_map: HashMap<Principal, Nat> = HashMap::new();
    asset_info.iter().for_each(|info| {
        let address = match &info.asset {
            Asset::IC { address } => address,
        };

        let default_fee = Nat::from(0u64);
        let network_fee = fee_map.get(address).unwrap_or(&default_fee);

        // Total = (amount * max_use) + outbound_fee(max_use, fee)
        let total_amount = info.amount_per_link_use_action.clone() * Nat::from(max_use_count);
        // fee for all future claims
        let outbound_fee = calc_outbound_fee(max_use_count, network_fee);
        let sending_amount = total_amount + outbound_fee;

        balance_map.insert(*address, sending_amount);
    });

    balance_map
}

/// Calculate the total fee required to create a link
/// # Arguments
/// * `fee_map` - A map of token principal to its corresponding fee
/// # Returns
/// * `(actual_amount: Nat, approved_amount: Nat)` - A tuple containing the actual fee amount and the approved fee amount
pub fn calculate_create_link_fee(fee_map: &HashMap<Principal, Nat>) -> (Nat, Nat) {
    let create_link_fee = Nat::from(CREATE_LINK_FEE);
    let default_fee = Nat::from(0u64);
    let fee_in_nat = fee_map.get(&ICP_CANISTER_PRINCIPAL).unwrap_or(&default_fee);
    (
        create_link_fee.clone(),
        create_link_fee + fee_in_nat.clone(),
    )
}

#[cfg(test)]
mod link_creation_tests {
    use super::*;

    #[test]
    fn test_calculate_link_balance_map() {
        let asset = Asset::default();
        let label = "Test Asset1".to_string();
        let amount_per_link_use_action = Nat::from(10u64);

        let asset_info = AssetInfo {
            asset: asset.clone(),
            label: label.clone(),
            amount_per_link_use_action: amount_per_link_use_action.clone(),
        };

        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(2u64))]
            .into_iter()
            .collect();

        let max_use_count = 3u64;

        let balance_map = calculate_link_balance_map(&[asset_info], &fee_map, max_use_count);

        let expected_sending_amount = amount_per_link_use_action * Nat::from(3u64);
        let address = match &asset {
            Asset::IC { address } => address,
        };
        assert_eq!(
            balance_map.get(address).cloned().unwrap(),
            expected_sending_amount
        );
    }

    #[test]
    fn test_calculate_create_link_fee() {
        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(5u64))]
            .into_iter()
            .collect();

        let (actual_amount, approved_amount) = calculate_create_link_fee(&fee_map);

        assert_eq!(actual_amount, Nat::from(CREATE_LINK_FEE));
        assert_eq!(approved_amount, Nat::from(CREATE_LINK_FEE + 5u64));
    }
}
