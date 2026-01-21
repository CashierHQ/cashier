// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::dto::action::IntentDto;

/// Asserts that intent fee fields are correctly populated with expected values.
///
/// # Arguments
/// * `intent` - The intent DTO to verify
/// * `expected_total_amount` - Expected value for intent_total_amount
/// * `expected_network_fee` - Expected value for intent_total_network_fee
/// * `expected_user_fee` - Expected value for intent_user_fee
pub fn assert_intent_fees(
    intent: &IntentDto,
    expected_total_amount: Nat,
    expected_network_fee: Nat,
    expected_user_fee: Nat,
) {
    assert!(
        intent.intent_total_amount.is_some(),
        "intent_total_amount should be Some"
    );
    assert_eq!(
        intent.intent_total_amount.clone().unwrap(),
        expected_total_amount,
        "intent_total_amount mismatch: expected {}, got {:?}",
        expected_total_amount,
        intent.intent_total_amount
    );

    assert!(
        intent.intent_total_network_fee.is_some(),
        "intent_total_network_fee should be Some"
    );
    assert_eq!(
        intent.intent_total_network_fee.clone().unwrap(),
        expected_network_fee,
        "intent_total_network_fee mismatch: expected {}, got {:?}",
        expected_network_fee,
        intent.intent_total_network_fee
    );

    assert!(
        intent.intent_user_fee.is_some(),
        "intent_user_fee should be Some"
    );
    assert_eq!(
        intent.intent_user_fee.clone().unwrap(),
        expected_user_fee,
        "intent_user_fee mismatch: expected {}, got {:?}",
        expected_user_fee,
        intent.intent_user_fee
    );
}
