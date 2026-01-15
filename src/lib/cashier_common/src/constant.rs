use candid::Principal;

// This is the slice of the ICP canister ID ryjl3-tyaaa-aaaaa-aaaba-cai
const ICP_CANISTER_SLICE: [u8; 10] = [0, 0, 0, 0, 0, 0, 0, 2, 1, 1];
pub const ICP_CANISTER_PRINCIPAL: Principal = Principal::from_slice(&ICP_CANISTER_SLICE);

// This is the slice of the FEE_TREASURY_ADDRESS lx4gp-2tgox-deted-i72n3-az3f3-wjavu-kiems-ctavz-dgdxi-fhyqa-lae
const FEE_TREASURY_SLICE: [u8; 29] = [
    102, 117, 198, 73, 144, 104, 254, 155, 176, 103, 101, 221, 146, 10, 209, 72, 35, 36, 41, 130,
    185, 25, 135, 116, 20, 248, 128, 22, 2,
];
pub const FEE_TREASURY_PRINCIPAL: Principal = Principal::from_slice(&FEE_TREASURY_SLICE);

pub const ICRC_TRANSACTION_TIME_WINDOW_NANOSECS: u64 = 24 * 3600 * 1_000_000_000; // 24 hours

pub const CREATE_LINK_FEE: u64 = 10_000;

/// Default TTL in nanoseconds (168 hours = 7 days)
pub const DEFAULT_TOKEN_FEE_TTL_NS: u64 = 168 * 60 * 60 * 1_000_000_000;

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
