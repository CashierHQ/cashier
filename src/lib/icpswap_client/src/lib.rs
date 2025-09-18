pub mod client;
pub mod types;

use candid::Principal;
pub use ic_mple_client::*;

/// IcpSwap Principal.
/// IcpSwap canister id: ggzvv-5qaaa-aaaag-qck7a-cai
pub const ICPSWAP_PRINCIPAL: Principal = Principal::from_slice(&[0, 0, 0, 0, 0, 208, 18, 190, 1, 1]);

#[cfg(test)]
mod tests {

    use candid::Principal;

    use super::*;

    #[test]
    fn test_icpswap_principal() {
        assert_eq!(ICPSWAP_PRINCIPAL, Principal::from_text("ggzvv-5qaaa-aaaag-qck7a-cai").unwrap());
    }

}