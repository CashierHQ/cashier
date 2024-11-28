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
    pub id: String,
    pub status: TransactionStatus,
    pub to: Account,
    pub from: Account,
    pub amount: u64,
    pub address: String,
    pub chain: Chain,
}

impl Transaction {
    pub fn new(
        id: String,
        status: TransactionStatus,
        to: Account,
        from: Account,
        amount: u64,
        address: String,
        chain: Chain,
    ) -> Self {
        Self {
            id,
            status,
            to,
            from,
            amount,
            address,
            chain,
        }
    }

    pub fn to_persistence(self) -> crate::store::entities::transaction::Transaction {
        crate::store::entities::transaction::Transaction::new(
            self.id,
            self.status,
            self.to,
            self.from,
            self.amount,
            self.address,
            self.chain,
        )
    }

    pub fn from_persistence(transaction: crate::store::entities::transaction::Transaction) -> Self {
        let id = transaction.pk.split('#').last().unwrap().to_string();
        Self {
            id,
            status: transaction.status,
            to: transaction.to,
            from: transaction.from,
            amount: transaction.amount,
            address: transaction.address,
            chain: transaction.chain,
        }
    }
}
