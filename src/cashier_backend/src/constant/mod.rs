// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use log::error;

// This is the slice of the ICP canister ID ryjl3-tyaaa-aaaaa-aaaba-cai
const ICP_CANISTER_SLICE: [u8; 10] = [0, 0, 0, 0, 0, 0, 0, 2, 1, 1];
pub const ICP_CANISTER_PRINCIPAL: Principal = Principal::from_slice(&ICP_CANISTER_SLICE);

// This is the slice of the FEE_TREASURY_ADDRESS lx4gp-2tgox-deted-i72n3-az3f3-wjavu-kiems-ctavz-dgdxi-fhyqa-lae
const FEE_TREASURY_SLICE: [u8; 29] = [
    102, 117, 198, 73, 144, 104, 254, 155, 176, 103, 101, 221, 146, 10, 209, 72, 35, 36, 41, 130,
    185, 25, 135, 116, 20, 248, 128, 22, 2,
];
pub const FEE_TREASURY_PRINCIPAL: Principal = Principal::from_slice(&FEE_TREASURY_SLICE);

pub const TX_TIMEOUT_IN_SECONDS: &str = match option_env!("TX_TIMEOUT") {
    Some(val) => val,
    None => "300",
};

pub fn get_tx_timeout_seconds() -> u64 {
    TX_TIMEOUT_IN_SECONDS.parse::<u64>().unwrap_or_else(|_| {
        // Log the error
        error!(
                "Warning: Could not parse TX_TIMEOUT '{TX_TIMEOUT_IN_SECONDS}'. Using default value of 300 seconds."        );
        300
    })
}

pub fn get_tx_timeout_nano_seconds() -> u64 {
    get_tx_timeout_seconds() * 1_000_000_000
}

pub const ICRC_TRANSACTION_TIME_WINDOW_NANOSECS: u64 = 24 * 3600 * 1_000_000_000; // 24 hours

#[cfg(test)]
pub mod dfd {
    use super::*;

    #[test]
    fn test_icp_principal() {
        assert_eq!(
            ICP_CANISTER_PRINCIPAL,
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()
        );
    }

    #[test]
    fn test_fee_treasury_principal() {
        assert_eq!(
            FEE_TREASURY_PRINCIPAL,
            Principal::from_text("lx4gp-2tgox-deted-i72n3-az3f3-wjavu-kiems-ctavz-dgdxi-fhyqa-lae")
                .unwrap()
        );
    }
}
