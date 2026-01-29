// AUTO-GENERATED FILE - DO NOT EDIT
// Transpiled from: logic/fee-calculations.ts
// To modify fee logic, edit the TypeScript source and regenerate.

// Note: Some TypeScript-only functions (e.g., calculateIntentFees) are not
// transpiled because they use TypeScript-specific features like typeof,
// nullish coalescing (??), and union types.

#![allow(dead_code)]

use candid::Nat;
use crate::types::{IntentParticipants, TokenStandard};

/// Calculate the total amount for an intent based on participants.
/// 
/// Formula by participant type:
/// - CreatorToTreasury: link_creation_fee (fee to create the link)
/// - CreatorToLink: user_input_amount * max_use (funding the link)
/// - UserToLink: user_input_amount (user sending to link)
/// - LinkToUser: user_input_amount (user receiving from link)
/// - LinkToCreator: link_max_asset_amount (withdrawal/refund)
pub fn calculate_intent_total_amount(participants: &IntentParticipants, user_input_amount: &Nat, max_use: u64, link_creation_fee: &Nat, link_max_asset_amount: &Nat) -> Nat {
    match participants {
        IntentParticipants::CreatorToTreasury => {
            link_creation_fee.clone()
        }
        IntentParticipants::CreatorToLink => {
            user_input_amount.clone() * Nat::from(max_use as u64)
        }
        IntentParticipants::UserToLink => {
            user_input_amount.clone()
        }
        IntentParticipants::LinkToUser => {
            user_input_amount.clone()
        }
        IntentParticipants::LinkToCreator => {
            link_max_asset_amount.clone()
        }
        _ => {
            Nat::from(0u64)
        }
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
/// - UserToLink: inbound (1x or 2x) + 1x outbound
/// - LinkToUser: no inbound + 1x outbound
/// - LinkToCreator: no inbound + 1x outbound
pub fn calculate_intent_total_network_fee(participants: &IntentParticipants, token_standard: &TokenStandard, asset_network_fee: &Nat, max_use: u64) -> Nat {
    let inbound_multiplier = if *token_standard == TokenStandard::ICRC2 { Nat::from(2u64) } else { Nat::from(1u64) };
    match participants {
        IntentParticipants::CreatorToTreasury => {
            asset_network_fee.clone() * inbound_multiplier.clone()
        }
        IntentParticipants::CreatorToLink => {
            (asset_network_fee.clone() * inbound_multiplier.clone() + asset_network_fee.clone() * Nat::from(max_use as u64))
        }
        IntentParticipants::UserToLink => {
            asset_network_fee.clone() * inbound_multiplier.clone() + asset_network_fee.clone()
        }
        IntentParticipants::LinkToUser => {
            asset_network_fee.clone()
        }
        IntentParticipants::LinkToCreator => {
            asset_network_fee.clone()
        }
        _ => {
            Nat::from(0u64)
        }
    }
}

/// Calculate the fee paid by the user for an intent.
/// 
/// This is what the user actually pays from their perspective.
/// 
/// Formula by participant type:
/// - CreatorToTreasury: total_amount + network_fee (pays everything)
/// - CreatorToLink: network_fee only (amount goes to link)
/// - UserToLink: network_fee only
/// - LinkToUser: 0 (free to receive)
/// - LinkToCreator: network_fee (pays withdrawal fee)
pub fn calculate_intent_user_fee(participants: &IntentParticipants, intent_total_amount: &Nat, intent_total_network_fee: &Nat) -> Nat {
    match participants {
        IntentParticipants::CreatorToTreasury => {
            intent_total_amount.clone() + intent_total_network_fee.clone()
        }
        IntentParticipants::CreatorToLink => {
            intent_total_network_fee.clone()
        }
        IntentParticipants::UserToLink => {
            intent_total_network_fee.clone()
        }
        IntentParticipants::LinkToUser => {
            Nat::from(0u64)
        }
        IntentParticipants::LinkToCreator => {
            intent_total_network_fee.clone()
        }
        _ => {
            Nat::from(0u64)
        }
    }
}
