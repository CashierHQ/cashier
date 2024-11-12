use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::account::Account;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum TransactionStatus {
    Created,
    Processing,
    Success,
    Failed,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Transaction {
    pub id: String,
    pub status: TransactionStatus,
    pub to: Account,
    pub from: Account,
    pub amount: u64,
    pub address: String,
    pub chain: String,
}
