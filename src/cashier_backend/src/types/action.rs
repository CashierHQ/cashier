use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::transaction::Transaction;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Status {
    Created,
    Processing,
    Success,
    Failed,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ClaimActionParams {
    address: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum CreateActionParams {
    Claim(ClaimActionParams),
    None,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum ActionType {
    Create,
    Withdraw,
    Claim,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInput {
    pub action_type: ActionType,
    pub params: CreateActionParams,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Action {
    pub id: String,
    pub creator_id: String,
    pub link_id: String,
    pub status: Status,
    pub action_type: ActionType,
    pub transactions: Vec<Transaction>,
}

impl Action {
    pub fn new(
        id: String,
        creator_id: String,
        link_id: String,
        status: Status,
        action_type: ActionType,
        transactions: Vec<Transaction>,
    ) -> Self {
        Self {
            id,
            creator_id,
            link_id,
            status,
            action_type,
            transactions,
        }
    }

    pub fn add_transaction(&mut self, transaction: Transaction) {
        self.transactions.push(transaction);
    }

    pub fn add_bulk_transactions(&mut self, transactions: Vec<Transaction>) {
        self.transactions.extend(transactions);
    }

    pub fn to_persistence(&self) -> crate::store::entities::action::Action {
        crate::store::entities::action::Action::new(
            self.id.clone(),
            self.status.clone(),
            self.action_type.clone(),
            self.link_id.clone(),
            self.creator_id.clone(),
        )
    }

    pub fn from_persistence(
        action: crate::store::entities::action::Action,
        transactions: Vec<Transaction>,
    ) -> Self {
        Self {
            id: action.pk.split('#').last().unwrap().to_string(),
            creator_id: action.creator_id,
            link_id: action.link_id,
            status: action.status,
            action_type: action.action_type,
            transactions: transactions,
        }
    }
}
