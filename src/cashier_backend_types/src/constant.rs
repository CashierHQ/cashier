use candid::Principal;

pub const INTENT_LABEL_LINK_CREATION_FEE: &str = "LINK_CREATION_FEE";
pub const INTENT_LABEL_SEND_TIP_ASSET: &str = "SEND_TIP_ASSET";
pub const INTENT_LABEL_SEND_AIRDROP_ASSET: &str = "SEND_AIRDROP_ASSET";
pub const INTENT_LABEL_SEND_TOKEN_BASKET_ASSET: &str = "SEND_TOKEN_BASKET_ASSET";
pub const INTENT_LABEL_RECEIVE_PAYMENT_ASSET: &str = "RECEIVE_PAYMENT_ASSET";

pub const ICP_TOKEN: &str = "ICP";
pub const CKBTC_ICRC_TOKEN: &str = "ckBTC";
pub const CKUSDC_ICRC_TOKEN: &str = "ckUSDC";
pub const CKETH_ICRC_TOKEN: &str = "ckETH";
pub const DOGE_ICRC_TOKEN: &str = "DOGE";

// This is the slice of the FEE_TREASURY_ADDRESS lx4gp-2tgox-deted-i72n3-az3f3-wjavu-kiems-ctavz-dgdxi-fhyqa-lae
const FEE_TREASURY_SLICE: [u8; 29] = [
    102, 117, 198, 73, 144, 104, 254, 155, 176, 103, 101, 221, 146, 10, 209, 72, 35, 36, 41, 130,
    185, 25, 135, 116, 20, 248, 128, 22, 2,
];
pub const FEE_TREASURY_PRINCIPAL: Principal = Principal::from_slice(&FEE_TREASURY_SLICE);
