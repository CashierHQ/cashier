use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ActionTransaction {
    pub id: String,
    pub acton_id: String,
    pub transaction_id: String,
}
