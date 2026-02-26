// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{asset::v1::Asset, asset_info::v1::AssetInfo},
};
use cashier_common::constant::{CREATE_LINK_FEE, ICP_CANISTER_PRINCIPAL};
use cashier_shared::{IntentParticipants, calculate_intent_total_amount};
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

        let intent_amount = calculate_intent_total_amount(
            &IntentParticipants::CreatorToLink,
            &info.amount_per_link_use_action,
            max_use_count,
            &Nat::from(0u64),
            &Nat::from(0u64),
        );
        let sending_amount = intent_amount + fee_amount * Nat::from(max_use_count);

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
    let actual_amount = calculate_intent_total_amount(
        &IntentParticipants::CreatorToTreasury,
        &Nat::from(0u64),
        1,
        &Nat::from(CREATE_LINK_FEE),
        &Nat::from(0u64),
    );
    let default_fee = Nat::from(0u64);
    let fee_in_nat = fee_map.get(&ICP_CANISTER_PRINCIPAL).unwrap_or(&default_fee);
    (actual_amount.clone(), actual_amount + fee_in_nat.clone())
}

/// Calculate the actual and approval amount for an ICRC2 transfer intent
/// # Arguments
/// * `max_use` - The maximum number of uses for the link
/// * `amount_per_use` - The amount to be sent per use
/// * `asset` - The asset being transferred
/// * `fee_map` - A map of token principal to its corresponding fee
/// # Returns
/// * `Result<(Nat, Nat), CanisterError>` - A tuple containing the actual amount and the approval amount, or an error if the calculation fails
pub fn calculate_icrc2_transfer_intent_amount(
    max_use: u64,
    amount_per_use: &Nat,
    ledger_id: Principal,
    fee_map: &HashMap<Principal, Nat>,
) -> Result<(Nat, Nat), CanisterError> {
    let (inbound_fee, outbound_fee) =
        calculate_icrc2_transfer_intent_fee(max_use, ledger_id, fee_map)?;
    let actual_amount = amount_per_use.clone() * Nat::from(max_use) + outbound_fee;
    let approval_amount = actual_amount.clone() + inbound_fee.clone();
    Ok((actual_amount, approval_amount))
}

/// Calculate the inbound and outbound fee for an ICRC2 transfer intent
/// # Arguments
/// * `max_use` - The maximum number of uses for the link
/// * `asset` - The asset being transferred
/// * `fee_map` - A map of token principal to its corresponding fee
/// # Returns
/// * `Result<(Nat, Nat), CanisterError>` - A tuple containing the inbound and outbound fee, or an error if the calculation fails
pub fn calculate_icrc2_transfer_intent_fee(
    max_use: u64,
    ledger_id: Principal,
    fee_map: &HashMap<Principal, Nat>,
) -> Result<(Nat, Nat), CanisterError> {
    let fee = fee_map.get(&ledger_id);

    let fee = fee.ok_or_else(|| {
        CanisterError::HandleLogicError("Fee not found for the given asset in link".to_string())
    })?;

    let inbound_fee = Nat::from(2u32) * fee.clone();
    let outbound_fee = fee.clone() * Nat::from(max_use);
    Ok((inbound_fee, outbound_fee))
}

/// Calculate the actual and total amount for an ICRC1 transfer intent
/// # Arguments
/// * `max_use` - The maximum number of uses for the link
/// * `amount_per_use` - The amount to be sent per use
/// * `asset` - The asset being transferred
/// * `fee_map` - A map of token principal to its corresponding fee
/// # Returns
/// * `Result<(Nat, Nat), CanisterError>` - A tuple containing the actual amount and the total amount, or an error if the calculation fails
pub fn calculate_icrc1_transfer_intent_amount(
    max_use: u64,
    amount_per_use: &Nat,
    asset: &Asset,
    fee_map: &HashMap<Principal, Nat>,
) -> Result<(Nat, Nat), CanisterError> {
    let (inbound_fee, outbound_fee) = calculate_icrc1_transfer_intent_fee(max_use, asset, fee_map)?;
    let actual_amount = amount_per_use.clone() * Nat::from(max_use) + outbound_fee;
    let total_amount = actual_amount.clone() + inbound_fee.clone();
    Ok((actual_amount, total_amount))
}

/// Calculate the inbound and outbound fee for an ICRC1 transfer intent
/// # Arguments
/// * `max_use` - The maximum number of uses for the link
/// * `asset` - The asset being transferred
/// * `fee_map` - A map of token principal to its corresponding fee
/// # Returns
/// * `Result<(Nat, Nat), CanisterError>` - A tuple containing the inbound and outbound fee, or an error if the calculation fails
pub fn calculate_icrc1_transfer_intent_fee(
    max_use: u64,
    asset: &Asset,
    fee_map: &HashMap<Principal, Nat>,
) -> Result<(Nat, Nat), CanisterError> {
    let fee = match asset {
        Asset::IC { address } => fee_map.get(address),
    };
    let fee = fee.ok_or_else(|| {
        CanisterError::HandleLogicError("Fee not found for the given asset in link".to_string())
    })?;

    let inbound_fee = fee.clone();
    let outbound_fee = fee.clone() * Nat::from(max_use);
    Ok((inbound_fee, outbound_fee))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_calculate_link_balance_map() {
        // Arrange
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

        // Act
        let balance_map = calculate_link_balance_map(&[asset_info], &fee_map, max_use_count);

        // Assert
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
    fn it_should_calculate_create_link_fee() {
        // Arrange
        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(5u64))]
            .into_iter()
            .collect();

        // Act
        let (actual_amount, approved_amount) = calculate_create_link_fee(&fee_map);

        // Assert
        assert_eq!(actual_amount, Nat::from(CREATE_LINK_FEE));
        assert_eq!(approved_amount, Nat::from(CREATE_LINK_FEE + 5u64));
    }

    #[test]
    fn it_should_calculate_icrc2_transfer_intent_amount() {
        // Arrange
        let max_use = 4u64;
        let amount_per_use = Nat::from(20u64);

        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(3u64))]
            .into_iter()
            .collect();

        // Act
        let (actual_amount, approval_amount) = calculate_icrc2_transfer_intent_amount(
            max_use,
            &amount_per_use,
            ICP_CANISTER_PRINCIPAL,
            &fee_map,
        )
        .unwrap();

        // Assert
        let expected_outbound_fee = Nat::from(3u64) * Nat::from(max_use);
        let expected_inbound_fee = Nat::from(2u32) * Nat::from(3u64);
        let expected_actual_amount =
            amount_per_use.clone() * Nat::from(max_use) + expected_outbound_fee;
        let expected_approval_amount = expected_actual_amount.clone() + expected_inbound_fee;
        assert_eq!(actual_amount, expected_actual_amount);
        assert_eq!(approval_amount, expected_approval_amount);
    }

    #[test]
    fn it_should_calculate_icrc2_transfer_intent_fee() {
        // Arrange
        let max_use = 5u64;
        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(4u64))]
            .into_iter()
            .collect();

        // Act
        let (inbound_fee, outbound_fee) =
            calculate_icrc2_transfer_intent_fee(max_use, ICP_CANISTER_PRINCIPAL, &fee_map).unwrap();

        // Assert
        let expected_inbound_fee = Nat::from(2u32) * Nat::from(4u64);
        let expected_outbound_fee = Nat::from(4u64) * Nat::from(max_use);
        assert_eq!(inbound_fee, expected_inbound_fee);
        assert_eq!(outbound_fee, expected_outbound_fee);
    }

    #[test]
    fn it_should_calculate_icrc1_transfer_intent_amount() {
        // Arrange
        let max_use = 3u64;
        let amount_per_use = Nat::from(15u64);
        let asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(2u64))]
            .into_iter()
            .collect();

        // Act
        let (actual_amount, total_amount) =
            calculate_icrc1_transfer_intent_amount(max_use, &amount_per_use, &asset, &fee_map)
                .unwrap();

        // Assert
        let expected_outbound_fee = Nat::from(2u64) * Nat::from(max_use);
        let expected_inbound_fee = Nat::from(2u64);
        let expected_actual_amount =
            amount_per_use.clone() * Nat::from(max_use) + expected_outbound_fee;
        let expected_total_amount = expected_actual_amount.clone() + expected_inbound_fee;
        assert_eq!(actual_amount, expected_actual_amount);
        assert_eq!(total_amount, expected_total_amount);
    }

    #[test]
    fn it_should_calculate_icrc1_transfer_intent_fee() {
        // Arrange
        let max_use = 6u64;
        let asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(5u64))]
            .into_iter()
            .collect();

        // Act
        let (inbound_fee, outbound_fee) =
            calculate_icrc1_transfer_intent_fee(max_use, &asset, &fee_map).unwrap();

        // Assert
        let expected_inbound_fee = Nat::from(5u64);
        let expected_outbound_fee = Nat::from(5u64) * Nat::from(max_use);
        assert_eq!(inbound_fee, expected_inbound_fee);
        assert_eq!(outbound_fee, expected_outbound_fee);
    }
}
