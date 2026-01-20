// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Intent Fee Calculator
//!
//! Takes existing intent + link, auto-detects flow, calculates:
//! - intent_total_amount
//! - intent_total_network_fee
//! - intent_user_fee

mod flow_detector;
mod strategies;
mod traits;
mod types;

pub use traits::IntentFeeStrategy;
pub use types::{IntentFeeResult, IntentFlow};

use candid::{Nat, Principal};
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;
use flow_detector::detect_flow;
use strategies::get_strategy;

/// Calculate intent fees from existing intent
///
/// # Arguments
/// * `intent` - The created intent (has task + amount)
/// * `link` - The link (has creator + max_use_count)
/// * `caller` - Who initiated the action
/// * `network_fee` - Token network fee
pub fn calculate_intent_fees(
    intent: &Intent,
    link: &Link,
    caller: Principal,
    network_fee: Nat,
) -> IntentFeeResult {
    let flow = detect_flow(intent, link, caller);
    let strategy = get_strategy(flow);
    strategy.calculate(intent, link, network_fee)
}
