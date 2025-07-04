// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


#[derive(Clone, Copy)]
// If you change this, make sure to update the fee in the frontend as well
// src/cashier_frontend/src/services/fee.constants.ts
pub enum Fee {
    // 1_0000_0000 = 1 ICP
    // 100_000 = 0.001 ICP
    // 10_000 = 0.0001 ICP
    // TODO: change back to 0.001, this is for testing only
    // the actual cost should be + 2 ledger fees
    // eg: 10_000 + 10_000 (1 approve fee) + 10_000 (1 transfer fee) = 30_000
    CreateTipLinkFeeIcp = 10_000,
}

impl Fee {
    pub fn as_u64(&self) -> u64 {
        *self as u64
    }
}
