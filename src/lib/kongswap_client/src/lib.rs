pub mod client;
pub mod types;

use candid::Principal;
pub use ic_mple_client::*;

/// Kongswap Principal.
/// Kongswap canister id: 2ipq2-uqaaa-aaaar-qailq-cai
pub const KONGSWAP_PRINCIPAL: Principal = Principal::from_slice(&[0, 0, 0, 0, 2, 48, 2, 23, 1, 1]);

pub const ICPSWAP_PRINCIPAL: &str = "ggzvv-5qaaa-aaaag-qck7a-cai";

#[cfg(test)]
mod tests {

    use candid::Principal;

    use super::*;

    #[test]
    fn test_kongswap_principal() {
        assert_eq!(
            KONGSWAP_PRINCIPAL,
            Principal::from_text("2ipq2-uqaaa-aaaar-qailq-cai").unwrap()
        );
    }
}
