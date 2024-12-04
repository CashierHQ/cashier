use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::{account::Account, link::Chain};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum TransactionStatus {
    Created,
    Processing,
    Success,
    Failed,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Transaction {
    pub canister_id: String,
    pub method: String,
    pub arg: String,
}

impl Transaction {
    pub fn new(canister_id: String, method: String, arg: String) -> Self {
        Self {
            canister_id,
            method,
            arg,
        }
    }

    pub fn to_persistence(&self) -> Transaction {
        Transaction {
            canister_id: self.canister_id.clone(),
            method: self.method.clone(),
            arg: self.arg.clone(),
        }
    }
}
