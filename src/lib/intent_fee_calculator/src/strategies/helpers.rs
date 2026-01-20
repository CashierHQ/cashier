// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::repository::intent::v1::IntentType;
use cashier_backend_types::repository::intent::v2::Intent;

/// Extract amount from intent
/// # Arguments
/// * `intent` - The intent to extract amount from
/// # Returns
/// * `Nat` - The amount specified in the intent
pub fn get_intent_amount(intent: &Intent) -> Nat {
    match &intent.r#type {
        IntentType::Transfer(data) => data.amount.clone(),
        IntentType::TransferFrom(data) => data.amount.clone(),
    }
}

/// Smart detect ICRC1 vs ICRC2 from intent type
/// # Arguments
/// * `intent` - The intent to analyze
/// # Returns
/// * `bool` - True if ICRC2 (TransferFrom), False if ICRC
pub fn is_icrc2(intent: &Intent) -> bool {
    matches!(intent.r#type, IntentType::TransferFrom(_))
}

/// Calculate inbound network fee based on transfer type
/// # Arguments
/// * `intent` - The intent to analyze
/// * `network_fee` - The base network fee
/// # Returns
/// * `Nat` - The calculated inbound network fee
pub fn calc_inbound_fee(intent: &Intent, network_fee: &Nat) -> Nat {
    if is_icrc2(intent) {
        network_fee.clone() * Nat::from(2u64) // approve + transfer_from
    } else {
        network_fee.clone() // just transfer
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_backend_types::repository::common::{Asset, Wallet};
    use cashier_backend_types::repository::intent::v1::{TransferData, TransferFromData};

    fn make_transfer_intent(amount: u64) -> Intent {
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

    fn make_transfer_from_intent(amount: u64) -> Intent {
        Intent {
            r#type: IntentType::TransferFrom(TransferFromData {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(amount),
                actual_amount: None,
                approve_amount: None,
            }),
            ..Default::default()
        }
    }

    #[test]
    fn test_get_intent_amount_transfer() {
        let intent = make_transfer_intent(1000);
        assert_eq!(get_intent_amount(&intent), Nat::from(1000u64));
    }

    #[test]
    fn test_get_intent_amount_transfer_from() {
        let intent = make_transfer_from_intent(500);
        assert_eq!(get_intent_amount(&intent), Nat::from(500u64));
    }

    #[test]
    fn test_is_icrc2_transfer() {
        let intent = make_transfer_intent(100);
        assert!(!is_icrc2(&intent));
    }

    #[test]
    fn test_is_icrc2_transfer_from() {
        let intent = make_transfer_from_intent(100);
        assert!(is_icrc2(&intent));
    }

    #[test]
    fn test_calc_inbound_fee_icrc1() {
        let intent = make_transfer_intent(100);
        let fee = Nat::from(10u64);
        assert_eq!(calc_inbound_fee(&intent, &fee), Nat::from(10u64));
    }

    #[test]
    fn test_calc_inbound_fee_icrc2() {
        let intent = make_transfer_from_intent(100);
        let fee = Nat::from(10u64);
        assert_eq!(calc_inbound_fee(&intent, &fee), Nat::from(20u64));
    }
}
