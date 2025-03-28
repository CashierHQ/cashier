#[derive(Clone, Copy)]
pub enum Fee {
    // 1_0000_0000 = 1 ICP
    // 100_000 = 0.001 ICP
    CreateTipLinkFeeIcp = 100_000,
}

impl Fee {
    pub fn as_u64(&self) -> u64 {
        *self as u64
    }
}
