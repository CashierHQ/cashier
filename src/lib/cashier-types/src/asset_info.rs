use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::common::Chain;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct AssetInfo {
    pub address: String,
    pub chain: Chain,
    pub current_amount: u64,
    pub total_amount: u64,
    pub amount_per_claim: u64,
    pub total_claim: u64,
}
