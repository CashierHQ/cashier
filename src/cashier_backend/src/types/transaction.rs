use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum TransactionStatus {
    Created,
    Processing,
    Success,
    Failed,
    Timeout,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Transaction {
    pub canister_id: String,
    pub method: String,
    pub arg: String,
    pub status: TransactionStatus,
}

impl Transaction {
    pub fn new(
        canister_id: String,
        method: String,
        arg: String,
        status: TransactionStatus,
    ) -> Self {
        Self {
            canister_id,
            method,
            arg,
            status,
        }
    }
}
