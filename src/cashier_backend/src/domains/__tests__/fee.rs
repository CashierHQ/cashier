// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


#[cfg(test)]
mod tests {
    use crate::domains::fee::Fee;

    #[test]
    fn test_fee_as_u64() {
        assert_eq!(
            Fee::CreateTipLinkFeeIcp.as_u64(),
            100_000,
            "CreateTipLinkFeeIcp should be 100_000 (0.001 ICP)"
        );
    }
}
