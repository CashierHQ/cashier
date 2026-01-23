// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use serde::{Deserialize, Serialize};

/// Intent flow pattern (auto-detected)
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum IntentFlow {
    CreatorToTreasury, // Fee payment
    CreatorToLink,     // Send link creation deposit
    UserToLink,        // Receive link send action
    LinkToUser,        // Send link receive action
    LinkToCreator,     // Withdraw action
}

/// Result of fee calculation
/// Note: intent_total_amount is set directly by action handlers from source amount
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IntentFeeResult {
    pub intent_total_network_fee: Nat,
    pub intent_user_fee: Nat,
}
