use serde::{Deserialize, Serialize};

use crate::common::Chain;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetInfo {
    pub address: String,
    pub chain: Chain,
    pub total_amount: u64,
    pub amount_per_claim: u64,
    pub total_claim: u64,
    pub label: String,
}
