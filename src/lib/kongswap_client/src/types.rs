// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.

use candid::CandidType;
use serde::Deserialize;

#[derive(CandidType, Deserialize, Default)]
pub struct PoolReply {
    pub lp_token_symbol: String,
    pub name: String,
    pub lp_fee_0: candid::Nat,
    pub lp_fee_1: candid::Nat,
    pub balance_0: candid::Nat,
    pub balance_1: candid::Nat,
    pub address_0: String,
    pub address_1: String,
    pub symbol_0: String,
    pub symbol_1: String,
    pub pool_id: u32,
    pub price: f64,
    pub chain_0: String,
    pub chain_1: String,
    pub is_removed: bool,
    pub symbol: String,
    pub lp_fee_bps: u8,
}

#[derive(CandidType, Deserialize)]
pub enum PoolsResult {
    Ok(Vec<PoolReply>),
    Err(String),
}
