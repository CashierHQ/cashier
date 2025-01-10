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

    pub fn from_string(state: &str) -> Result<TransactionState, String> {
        match state {
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
    pub state: String,
}

impl Transaction {
    pub fn new(
        id: String,
        canister_id: String,
        method: String,
        arg: String,
        state: String,
    ) -> Self {
        Self {
            id,
            canister_id,
            method,
            arg,
            state,
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::transaction::Transaction {
        crate::repositories::entities::transaction::Transaction::new(
            self.id.clone(),
            self.canister_id.clone(),
            self.method.clone(),
            self.arg.clone(),
            self.state.clone(),
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
            state: transaction.state,
        }
    }

    pub fn create_and_airdrop_nft_default(id: String) -> Self {
        Self {
            id,
            canister_id: "canister_id".to_string(),
            method: "create_and_airdrop_nft".to_string(),
            arg: "arg".to_string(),
            state: "Transaction_state_created".to_string(),
        }
    }

    pub fn build_icrc_transfer(
        id: String,
        canister_id: String,
        transfer_arg: icrc_ledger_types::icrc1::transfer::TransferArg,
    ) -> Self {
        let canister_call =
            ic_icrc_tx::builder::icrc1::build_icrc1_transfer(canister_id, transfer_arg);

        Self {
            id,
            canister_id: canister_call.canister_id,
            method: canister_call.method,
            arg: canister_call.arg,
            state: TransactionState::Created.to_string(),
        }
    }

    pub fn build_icrc_approve(
        id: String,
        canister_id: String,
        approve_arg: icrc_ledger_types::icrc2::approve::ApproveArgs,
    ) -> Self {
        let canister_call =
            ic_icrc_tx::builder::icrc2::build_icrc2_approve(canister_id, approve_arg);

        Self {
            id,
            canister_id: canister_call.canister_id,
            method: canister_call.method,
            arg: canister_call.arg,
            state: TransactionState::Created.to_string(),
        }
    }
}
