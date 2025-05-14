#[derive(Clone, Copy)]
// If you change this, make sure to update the fee in the frontend as well
// src/cashier_frontend/src/services/fee.constants.ts
pub enum Fee {
    // 1_0000_0000 = 1 ICP
    // 100_000 = 0.001 ICP
    // 10_000 = 0.0001 ICP
    // CreateTipLinkFeeIcp = 100_000,
    // TODO: change back to 0.001, this is for testing only
    CreateTipLinkFeeIcp = 20_000,
}

impl Fee {
    pub fn as_u64(&self) -> u64 {
        *self as u64
    }
}
