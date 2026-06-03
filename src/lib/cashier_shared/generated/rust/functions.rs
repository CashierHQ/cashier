// AUTO-GENERATED FILE - DO NOT EDIT
// Transpiled from: logic/fee-calculations.ts
// To modify fee logic, edit the TypeScript source and regenerate.

// Note: Some TypeScript-only functions (e.g., calculateIntentFees) are not
// transpiled because they use TypeScript-specific features like typeof,
// nullish coalescing (??), and union types.

#![allow(dead_code)]

use crate::fee_table::{
    get_gate_create_fee_table_amount, get_gate_open_fee_table_amount,
    get_link_creation_fee_table_amount,
};
use crate::types::{IntentParticipants, TokenStandard};
use candid::Nat;

/// Link creation fee in ICP e8s.
///
/// Loaded from templates/fees.json through the generated fee table.
pub fn get_link_creation_fee_amount() -> Nat {
    get_link_creation_fee_table_amount()
}

/// Gate creation fee in ICP e8s.
///
/// Loaded from templates/fees.json through the generated fee table.
pub fn get_gate_create_fee_amount() -> Nat {
    get_gate_create_fee_table_amount()
}

/// Gate open fee in ICP e8s.
///
/// Loaded from templates/fees.json through the generated fee table.
pub fn get_gate_open_fee_amount() -> Nat {
    get_gate_open_fee_table_amount()
}

/// Calculate the total gate fee for all gates on a link.
///
/// Formula:
/// gate_count * (gate_create_fee + max_use * gate_open_fee)
pub fn calculate_gate_fee_amount(
    gate_count: u64,
    max_use: u64,
    gate_create_fee: &Nat,
    gate_open_fee: &Nat,
) -> Nat {
    Nat::from(gate_count)
        * (gate_create_fee.clone() + Nat::from(max_use) * gate_open_fee.clone()).clone()
}

/// Calculate the total amount for an intent based on participants.
///
/// Formula by participant type:
/// - CreatorToTreasury: link_creation_fee (fee to create the link)
/// - CreatorToLink: user_input_amount * max_use (funding the link)
/// - CreatorToGate: gate_count * (gate_create_fee + max_use * gate_open_fee)
/// - UserToLink: user_input_amount (user sending to link)
/// - LinkToUser: user_input_amount (user receiving from link)
/// - LinkToCreator: link_max_asset_amount (withdrawal/refund)
pub fn calculate_intent_total_amount(
    participants: IntentParticipants,
    user_input_amount: &Nat,
    max_use: u64,
    link_creation_fee: &Nat,
    link_max_asset_amount: &Nat,
    gate_count: u64,
    gate_create_fee: &Nat,
    gate_open_fee: &Nat,
) -> Nat {
    match participants {
        IntentParticipants::CreatorToTreasury => link_creation_fee.clone(),
        IntentParticipants::CreatorToLink => user_input_amount.clone() * Nat::from(max_use),
        IntentParticipants::CreatorToGate => {
            calculate_gate_fee_amount(gate_count, max_use, gate_create_fee, gate_open_fee)
        }
        IntentParticipants::UserToLink => user_input_amount.clone(),
        IntentParticipants::LinkToUser => user_input_amount.clone(),
        IntentParticipants::LinkToCreator => link_max_asset_amount.clone(),
    }
}

/// Calculate the total network fee for an intent.
///
/// Network fee = inbound_fee + outbound_fee
///
/// ICRC1: inbound = 1x fee
/// ICRC2: inbound = 2x fee (approve + transfer_from)
///
/// Formula by participant type:
/// - CreatorToTreasury: inbound only (1x or 2x), no outbound
/// - CreatorToLink: inbound (1x or 2x) + outbound per use
/// - CreatorToGate: inbound only (1x or 2x), no outbound
/// - UserToLink: inbound (1x or 2x) + 1x outbound
/// - LinkToUser: no inbound + 1x outbound
/// - LinkToCreator: no inbound + 1x outbound
pub fn calculate_intent_total_network_fee(
    participants: IntentParticipants,
    token_standard: TokenStandard,
    asset_network_fee: &Nat,
    max_use: u64,
) -> Nat {
    let inbound_fee = calculate_intent_inbound_network_fee(
        participants.clone(),
        token_standard.clone(),
        asset_network_fee,
    );
    let outbound_fee =
        calculate_intent_outbound_network_fee(participants.clone(), asset_network_fee, max_use);
    inbound_fee.clone() + outbound_fee.clone()
}

/// Calculate the inbound network fee for an intent.
pub fn calculate_intent_inbound_network_fee(
    participants: IntentParticipants,
    token_standard: TokenStandard,
    asset_network_fee: &Nat,
) -> Nat {
    let inbound_multiplier = if token_standard == TokenStandard::ICRC2 {
        Nat::from(2u64)
    } else {
        Nat::from(1u64)
    };
    match participants {
        IntentParticipants::CreatorToTreasury => {
            asset_network_fee.clone() * inbound_multiplier.clone()
        }
        IntentParticipants::CreatorToLink => asset_network_fee.clone() * inbound_multiplier.clone(),
        IntentParticipants::CreatorToGate => asset_network_fee.clone() * inbound_multiplier.clone(),
        IntentParticipants::UserToLink => asset_network_fee.clone() * inbound_multiplier.clone(),
        IntentParticipants::LinkToUser => Nat::from(0u64),
        IntentParticipants::LinkToCreator => Nat::from(0u64),
    }
}

/// Calculate the outbound network fee for an intent.
pub fn calculate_intent_outbound_network_fee(
    participants: IntentParticipants,
    asset_network_fee: &Nat,
    max_use: u64,
) -> Nat {
    match participants {
        IntentParticipants::CreatorToTreasury => Nat::from(0u64),
        IntentParticipants::CreatorToLink => asset_network_fee.clone() * Nat::from(max_use),
        IntentParticipants::CreatorToGate => Nat::from(0u64),
        IntentParticipants::UserToLink => asset_network_fee.clone(),
        IntentParticipants::LinkToUser => asset_network_fee.clone(),
        IntentParticipants::LinkToCreator => asset_network_fee.clone(),
    }
}

/// Calculate the fee paid by the user for an intent.
///
/// This is what the user actually pays from their perspective.
///
/// Formula by participant type:
/// - CreatorToTreasury: total_amount + network_fee (pays everything)
/// - CreatorToLink: network_fee only (amount goes to link)
/// - CreatorToGate: total_amount + network_fee (pays everything)
/// - UserToLink: network_fee only
/// - LinkToUser: 0 (free to receive)
/// - LinkToCreator: network_fee (pays withdrawal fee)
pub fn calculate_intent_user_fee(
    participants: IntentParticipants,
    intent_total_amount: &Nat,
    intent_total_network_fee: &Nat,
) -> Nat {
    match participants {
        IntentParticipants::CreatorToTreasury => {
            intent_total_amount.clone() + intent_total_network_fee.clone()
        }
        IntentParticipants::CreatorToLink => intent_total_network_fee.clone(),
        IntentParticipants::CreatorToGate => {
            intent_total_amount.clone() + intent_total_network_fee.clone()
        }
        IntentParticipants::UserToLink => intent_total_network_fee.clone(),
        IntentParticipants::LinkToUser => Nat::from(0u64),
        IntentParticipants::LinkToCreator => intent_total_network_fee.clone(),
    }
}
