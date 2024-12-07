use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum TransactionState {
    Created,
    Processing,
    Success,
    Fail,
    Timeout,
}

impl TransactionState {
    pub fn to_string(&self) -> String {
        match self {
            TransactionState::Created => "Transaction_state_created".to_string(),
            TransactionState::Processing => "Transaction_state_processing".to_string(),
            TransactionState::Success => "Transaction_state_success".to_string(),
            TransactionState::Fail => "Transaction_state_fail".to_string(),
            TransactionState::Timeout => "Transaction_state_timeout".to_string(),
        }
    }

    pub fn from_string(status: &str) -> Result<TransactionState, String> {
        match status {
            "Transaction_state_created" => Ok(TransactionState::Created),
            "Transaction_state_processing" => Ok(TransactionState::Processing),
            "Transaction_state_success" => Ok(TransactionState::Success),
            "Transaction_state_fail" => Ok(TransactionState::Fail),
            "Transaction_state_timeout" => Ok(TransactionState::Timeout),
            _ => Err("Invalid transaction state".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Transaction {
    pub id: String,
    pub canister_id: String,
    pub method: String,
    pub arg: String,
    pub status: String,
}

impl Transaction {
    pub fn new(
        id: String,
        canister_id: String,
        method: String,
        arg: String,
        status: String,
    ) -> Self {
        Self {
            id,
            canister_id,
            method,
            arg,
            status,
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::transaction::Transaction {
        let pk = crate::repositories::entities::transaction::Transaction::build_pk(self.id.clone());
        crate::repositories::entities::transaction::Transaction::new(
            pk,
            self.canister_id.clone(),
            self.method.clone(),
            self.arg.clone(),
            self.status.clone(),
        )
    }

    pub fn from_persistence(
        transaction: crate::repositories::entities::transaction::Transaction,
    ) -> Self {
        let id = crate::repositories::entities::transaction::Transaction::split_pk(&transaction.pk);
        Self {
            id,
            canister_id: transaction.canister_id,
            method: transaction.method,
            arg: transaction.arg,
            status: transaction.status,
        }
    }

    pub fn create_and_airdrop_nft_default(id: String) -> Self {
        // TODO: make correct default values
        Self {
            id,
            canister_id: "canister_id".to_string(),
            method: "create_and_airdrop_nft".to_string(),
            arg: "arg".to_string(),
            status: "Transaction_state_created".to_string(),
        }
    }
}
