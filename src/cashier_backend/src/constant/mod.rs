pub const CASHIER_NFT_CANISTER_ID: &str = "hfevg-caaaa-aaaai-actwa-cai";

pub const ICP_CANISTER_ID: &str = "x5qut-viaaa-aaaar-qajda-cai";

pub const DEFAULT_TIMEOUT_IN_SECONDS: u64 = 10;

pub const TX_TIMEOUT_IN_SECONDS: &str = match option_env!("TX_TIMEOUT") {
    Some(val) => val,
    None => "300",
};

pub fn get_tx_timeout_nano_seconds() -> u64 {
    TX_TIMEOUT_IN_SECONDS.parse::<u64>().unwrap() * 1_000_000_000
}
