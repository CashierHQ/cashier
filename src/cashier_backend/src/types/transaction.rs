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

impl TransactionStatus {
    pub fn to_string(&self) -> String {
        match self {
            TransactionStatus::Created => "Created".to_string(),
            TransactionStatus::Processing => "Processing".to_string(),
            TransactionStatus::Success => "Success".to_string(),
            TransactionStatus::Failed => "Failed".to_string(),
            TransactionStatus::Timeout => "Timeout".to_string(),
        }
    }

    pub fn from_string(status: &str) -> TransactionStatus {
        match status {
            "Created" => TransactionStatus::Created,
            "Processing" => TransactionStatus::Processing,
            "Success" => TransactionStatus::Success,
            "Failed" => TransactionStatus::Failed,
            "Timeout" => TransactionStatus::Timeout,
            _ => TransactionStatus::Created,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Transaction {
    pub canister_id: String,
    pub method: String,
    pub arg: String,
    pub status: String,
}

impl Transaction {
    pub fn new(canister_id: String, method: String, arg: String, status: String) -> Self {
        Self {
            canister_id,
            method,
            arg,
            status,
        }
    }
}
