pub const CASHIER_NFT_CANISTER_ID: &str = "hfevg-caaaa-aaaai-actwa-cai";

pub const ICP_CANISTER_ID: &str = "x5qut-viaaa-aaaar-qajda-cai";

pub const DEFAULT_TIMEOUT_IN_SECONDS: u64 = 10;

pub const TX_TIMEOUT: &str = match option_env!("TX_TIMEOUT") {
    Some(val) => val,
    None => "120",
};

pub const TX_TIMEOUT_NANOSECONDS: &str = match option_env!("TX_TIMEOUT_NANOSECONDS") {
    Some(val) => val,
    None => "120000000000",
};
