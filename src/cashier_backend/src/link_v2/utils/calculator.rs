// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{constant::ICP_CANISTER_PRINCIPAL, domains::fee::Fee};
use candid::{Nat, Principal};
use cashier_backend_types::repository::{asset_info::AssetInfo, common::Asset};
use std::collections::HashMap;

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
        let fee_in_nat = fee_map.get(address).unwrap_or(&default_fee);
        let fee_amount = fee_in_nat.clone();

        let sending_amount =
            (Nat::from(info.amount_per_link_use_action) + fee_amount) * Nat::from(max_use_count);

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
    let create_link_fee = Nat::from(Fee::CreateTipLinkFeeIcp.as_u64());
    let default_fee = Nat::from(0u64);
    let fee_in_nat = fee_map.get(&ICP_CANISTER_PRINCIPAL).unwrap_or(&default_fee);
    (
        create_link_fee.clone(),
        create_link_fee + fee_in_nat.clone(),
    )
}
