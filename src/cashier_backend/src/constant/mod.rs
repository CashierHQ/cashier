// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::error;

// If you change this, make sure to update the fee in the frontend as well
// src/cashier_frontend/src/services/fee.constants.ts
// pub const ICP_CANISTER_ID: &str = "x5qut-viaaa-aaaar-qajda-cai";
pub const ICP_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

pub const FEE_TREASURY_ADDRESS: &str =
    "lx4gp-2tgox-deted-i72n3-az3f3-wjavu-kiems-ctavz-dgdxi-fhyqa-lae";

pub const TX_TIMEOUT_IN_SECONDS: &str = match option_env!("TX_TIMEOUT") {
    Some(val) => val,
    None => "300",
};

pub fn get_tx_timeout_seconds() -> u64 {
    TX_TIMEOUT_IN_SECONDS.parse::<u64>().unwrap_or_else(|_| {
        // Log the error
        error!(
            "{}",
            format!(
                "Warning: Could not parse TX_TIMEOUT '{}'. Using default value of 300 seconds.",
                TX_TIMEOUT_IN_SECONDS
            )
        );
        300
    })
}

pub fn get_tx_timeout_nano_seconds() -> u64 {
    get_tx_timeout_seconds() * 1_000_000_000
}
pub const INTENT_LABEL_LINK_CREATION_FEE: &str = "LINK_CREATION_FEE"; // fee transfer
pub const INTENT_LABEL_SEND_TIP_ASSET: &str = "SEND_TIP_ASSET"; // tip link
pub const INTENT_LABEL_SEND_AIRDROP_ASSET: &str = "SEND_AIRDROP_ASSET"; //
pub const INTENT_LABEL_SEND_TOKEN_BASKET_ASSET: &str = "SEND_TOKEN_BASKET_ASSET"; //
pub const INTENT_LABEL_RECEIVE_PAYMENT_ASSET: &str = "RECEIVE_PAYMENT_ASSET"; // payment link
