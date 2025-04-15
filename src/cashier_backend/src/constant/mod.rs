pub const CASHIER_NFT_CANISTER_ID: &str = "hfevg-caaaa-aaaai-actwa-cai";

pub const ICP_CANISTER_ID: &str = "x5qut-viaaa-aaaar-qajda-cai";

pub const DEFAULT_TIMEOUT_IN_SECONDS: u64 = 10;

pub const TX_TIMEOUT_IN_SECONDS: &str = match option_env!("TX_TIMEOUT") {
    Some(val) => val,
    None => "300",
};

pub fn get_tx_timeout_seconds() -> u64 {
    TX_TIMEOUT_IN_SECONDS.parse::<u64>().unwrap_or_else(|_| {
        // Log the error
        ic_cdk::api::print(format!(
            "Warning: Could not parse TX_TIMEOUT '{}'. Using default value of 300 seconds.",
            TX_TIMEOUT_IN_SECONDS
        ));
        300
    })
}

pub fn get_tx_timeout_nano_seconds() -> u64 {
    get_tx_timeout_seconds() * 1_000_000_000
}
pub const INTENT_LABEL_LINK_CREATION_FEE: &str = "LINK_CREATION_FEE"; // fee transfer

pub const INTENT_LABEL_SEND_TIP_ASSET: &str = "SEND_TIP_ASSET"; // tip link
pub const INTENT_LABEL_SEND_AIRDROP_ASSET: &str = "SEND_AIRDROP_ASSET"; //
pub const INTENT_LABEL_SEND_TOKEN_BASKET_ASSET: &str = "SEND_TOKEN_BASKET_ASSET"; //

pub const INTENT_LABEL_RECEIVE_PAYMENT_ASSET: &str = "RECEIVE_PAYMENT_ASSET"; // payment link

pub const INTENT_LABEL_WALLET_TO_LINK_PAYMENT: &str = "1002";
