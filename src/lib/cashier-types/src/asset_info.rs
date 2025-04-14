use serde::{Deserialize, Serialize};

use crate::common::Chain;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AssetInfo {
    pub address: String,
    pub chain: Chain,
    // how many asset we have in total
    pub total_amount: u64,
    pub label: String,

    // For tip, airdrop, token basket
    pub amount_per_claim: Option<u64>,
    pub claim_count: Option<u64>,
}
