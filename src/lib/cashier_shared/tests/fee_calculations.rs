// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Tests for cashier_shared fee calculation functions.
//! Test values match fixtures in tests/fixtures/fee-calculations.json

use candid::Nat;
use cashier_shared::{
    calculate_intent_total_amount, calculate_intent_total_network_fee, calculate_intent_user_fee,
    IntentParticipants, TokenStandard,
};

// ---------------------------------------------------------------------------
// calculate_intent_total_amount
// ---------------------------------------------------------------------------

#[test]
fn total_amount_creator_to_treasury_returns_link_creation_fee() {
    let result = calculate_intent_total_amount(
        IntentParticipants::CreatorToTreasury,
        &Nat::from(0u64),
        1,
        &Nat::from(50_000u64),
        &Nat::from(0u64),
    );
    assert_eq!(result, Nat::from(50_000u64));
}

#[test]
fn total_amount_creator_to_link_multiplies_by_max_use() {
    let result = calculate_intent_total_amount(
        IntentParticipants::CreatorToLink,
        &Nat::from(20_000u64),
        3,
        &Nat::from(0u64),
        &Nat::from(0u64),
    );
    assert_eq!(result, Nat::from(60_000u64));
}

#[test]
fn total_amount_user_to_link_returns_user_input() {
    let result = calculate_intent_total_amount(
        IntentParticipants::UserToLink,
        &Nat::from(100_000_000u64),
        1,
        &Nat::from(0u64),
        &Nat::from(0u64),
    );
    assert_eq!(result, Nat::from(100_000_000u64));
}

#[test]
fn total_amount_link_to_user_returns_user_input() {
    let result = calculate_intent_total_amount(
        IntentParticipants::LinkToUser,
        &Nat::from(20_000u64),
        1,
        &Nat::from(0u64),
        &Nat::from(0u64),
    );
    assert_eq!(result, Nat::from(20_000u64));
}

#[test]
fn total_amount_link_to_creator_returns_link_max_asset() {
    let result = calculate_intent_total_amount(
        IntentParticipants::LinkToCreator,
        &Nat::from(0u64),
        1,
        &Nat::from(0u64),
        &Nat::from(150_000u64),
    );
    assert_eq!(result, Nat::from(150_000u64));
}

// ---------------------------------------------------------------------------
// calculate_intent_total_network_fee
// ---------------------------------------------------------------------------

#[test]
fn network_fee_creator_to_treasury_icrc1() {
    let result = calculate_intent_total_network_fee(
        IntentParticipants::CreatorToTreasury,
        TokenStandard::ICRC1,
        &Nat::from(10_000u64),
        1,
    );
    assert_eq!(result, Nat::from(10_000u64));
}

#[test]
fn network_fee_creator_to_treasury_icrc2() {
    let result = calculate_intent_total_network_fee(
        IntentParticipants::CreatorToTreasury,
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        1,
    );
    assert_eq!(result, Nat::from(20_000u64));
}

#[test]
fn network_fee_creator_to_link_icrc1() {
    // 10000 * 1 + 10000 * 3 = 40000
    let result = calculate_intent_total_network_fee(
        IntentParticipants::CreatorToLink,
        TokenStandard::ICRC1,
        &Nat::from(10_000u64),
        3,
    );
    assert_eq!(result, Nat::from(40_000u64));
}

#[test]
fn network_fee_creator_to_link_icrc2() {
    // 10000 * 2 + 10000 * 3 = 50000
    let result = calculate_intent_total_network_fee(
        IntentParticipants::CreatorToLink,
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        3,
    );
    assert_eq!(result, Nat::from(50_000u64));
}

#[test]
fn network_fee_user_to_link_icrc1() {
    let result = calculate_intent_total_network_fee(
        IntentParticipants::UserToLink,
        TokenStandard::ICRC1,
        &Nat::from(10_000u64),
        1,
    );
    assert_eq!(result, Nat::from(20_000u64));
}

#[test]
fn network_fee_user_to_link_icrc2() {
    let result = calculate_intent_total_network_fee(
        IntentParticipants::UserToLink,
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        1,
    );
    assert_eq!(result, Nat::from(30_000u64));
}

#[test]
fn network_fee_link_to_user_outbound_only() {
    let result = calculate_intent_total_network_fee(
        IntentParticipants::LinkToUser,
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        1,
    );
    assert_eq!(result, Nat::from(10_000u64));
}

#[test]
fn network_fee_link_to_creator_outbound_only() {
    let result = calculate_intent_total_network_fee(
        IntentParticipants::LinkToCreator,
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        1,
    );
    assert_eq!(result, Nat::from(10_000u64));
}

// ---------------------------------------------------------------------------
// calculate_intent_user_fee
// ---------------------------------------------------------------------------

#[test]
fn user_fee_creator_to_treasury_pays_amount_plus_network() {
    let result = calculate_intent_user_fee(
        IntentParticipants::CreatorToTreasury,
        &Nat::from(50_000u64),
        &Nat::from(20_000u64),
    );
    assert_eq!(result, Nat::from(70_000u64));
}

#[test]
fn user_fee_creator_to_link_pays_network_only() {
    let result = calculate_intent_user_fee(
        IntentParticipants::CreatorToLink,
        &Nat::from(60_000u64),
        &Nat::from(50_000u64),
    );
    assert_eq!(result, Nat::from(50_000u64));
}

#[test]
fn user_fee_user_to_link_pays_network_only() {
    let result = calculate_intent_user_fee(
        IntentParticipants::UserToLink,
        &Nat::from(100_000_000u64),
        &Nat::from(30_000u64),
    );
    assert_eq!(result, Nat::from(30_000u64));
}

#[test]
fn user_fee_link_to_user_free() {
    let result = calculate_intent_user_fee(
        IntentParticipants::LinkToUser,
        &Nat::from(20_000u64),
        &Nat::from(10_000u64),
    );
    assert_eq!(result, Nat::from(0u64));
}

#[test]
fn user_fee_link_to_creator_pays_network() {
    let result = calculate_intent_user_fee(
        IntentParticipants::LinkToCreator,
        &Nat::from(150_000u64),
        &Nat::from(10_000u64),
    );
    assert_eq!(result, Nat::from(10_000u64));
}

// ---------------------------------------------------------------------------
// End-to-end: full fee calculation pipeline
// ---------------------------------------------------------------------------

#[test]
fn e2e_airdrop_creator_to_treasury_icrc2() {
    let participants = IntentParticipants::CreatorToTreasury;
    let amount = calculate_intent_total_amount(
        participants.clone(),
        &Nat::from(0u64),
        3,
        &Nat::from(50_000u64),
        &Nat::from(0u64),
    );
    let network_fee = calculate_intent_total_network_fee(
        participants.clone(),
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        3,
    );
    let user_fee = calculate_intent_user_fee(participants.clone(), &amount, &network_fee);

    assert_eq!(amount, Nat::from(50_000u64));
    assert_eq!(network_fee, Nat::from(20_000u64));
    assert_eq!(user_fee, Nat::from(70_000u64));
}

#[test]
fn e2e_airdrop_creator_to_link_icrc2() {
    let participants = IntentParticipants::CreatorToLink;
    let amount = calculate_intent_total_amount(
        participants.clone(),
        &Nat::from(20_000u64),
        3,
        &Nat::from(0u64),
        &Nat::from(0u64),
    );
    let network_fee = calculate_intent_total_network_fee(
        participants.clone(),
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        3,
    );
    let user_fee = calculate_intent_user_fee(participants.clone(), &amount, &network_fee);

    assert_eq!(amount, Nat::from(60_000u64));
    assert_eq!(network_fee, Nat::from(50_000u64));
    assert_eq!(user_fee, Nat::from(50_000u64));
}

#[test]
fn e2e_airdrop_link_to_user_claim() {
    let participants = IntentParticipants::LinkToUser;
    let amount = calculate_intent_total_amount(
        participants.clone(),
        &Nat::from(20_000u64),
        1,
        &Nat::from(0u64),
        &Nat::from(0u64),
    );
    let network_fee = calculate_intent_total_network_fee(
        participants.clone(),
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        1,
    );
    let user_fee = calculate_intent_user_fee(participants.clone(), &amount, &network_fee);

    assert_eq!(amount, Nat::from(20_000u64));
    assert_eq!(network_fee, Nat::from(10_000u64));
    assert_eq!(user_fee, Nat::from(0u64));
}

#[test]
fn e2e_payment_user_to_link_icrc2() {
    let participants = IntentParticipants::UserToLink;
    let amount = calculate_intent_total_amount(
        participants.clone(),
        &Nat::from(100_000_000u64),
        1,
        &Nat::from(0u64),
        &Nat::from(0u64),
    );
    let network_fee = calculate_intent_total_network_fee(
        participants.clone(),
        TokenStandard::ICRC2,
        &Nat::from(10_000u64),
        1,
    );
    let user_fee = calculate_intent_user_fee(participants.clone(), &amount, &network_fee);

    assert_eq!(amount, Nat::from(100_000_000u64));
    assert_eq!(network_fee, Nat::from(30_000u64));
    assert_eq!(user_fee, Nat::from(30_000u64));
}
