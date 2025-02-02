use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct IntentTransaction {
    pub intent_id: String,
    pub transaction_id: String,
    pub created_at: u64,
}

impl IntentTransaction {
    pub fn new(intent_id: String, transaction_id: String, ts: u64) -> Self {
        Self {
            intent_id,
            transaction_id,
            created_at: ts,
        }
    }
}
