// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::HashMap;

use candid::{CandidType, Principal};

use icrc_ledger_types::icrc1::account::Subaccount;
use serde::{Deserialize, Serialize};

use crate::{
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::{Asset, Chain, Wallet},
        intent::v2::{Intent, IntentState, IntentTask, IntentType},
        transaction::v1::{FromCallType, Protocol, Transaction, TransactionState},
    },
    service::action::ActionData,
};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInput {
    pub link_id: String,
    pub action_type: ActionType,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct TriggerTransactionInput {
    pub link_id: String,
    pub action_id: String,
    pub transaction_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionInput {
    pub link_id: String,
    pub action_type: ActionType,
    pub action_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionAnonymousInput {
    pub link_id: String,
    pub action_type: ActionType,
    pub action_id: String,
    pub wallet_address: Principal,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionAnonymousInput {
    pub link_id: String,
    pub action_type: ActionType,
    pub wallet_address: Principal,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ConfirmActionInput {
    pub action_id: String,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ActionDto {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: Principal,
    pub intents: Vec<IntentDto>,
    pub icrc_112_requests: Option<Icrc112Requests>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct IntentDto {
    pub id: String,
    pub state: IntentState,
    pub created_at: u64,
    pub chain: Chain,
    pub task: IntentTask,
    pub r#type: IntentType,
    pub transactions: Vec<TransactionDto>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct TransactionDto {
    pub id: String,
    pub created_at: u64,
    pub state: TransactionState,
    pub dependency: Option<Vec<String>>,
    pub group: u16,
    pub from_call_type: FromCallType,
    pub protocol: Protocol,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]
pub enum WalletDto {
    IC {
        address: Principal,
        subaccount: Option<Subaccount>,
    },
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]

pub struct AssetDto {
    pub asset: Asset,
}

impl ActionDto {
    pub fn from(action: Action, intents: Vec<Intent>) -> Self {
        Self {
            id: action.id,
            r#type: action.r#type,
            state: action.state,
            creator: action.creator,
            intents: intents.into_iter().map(IntentDto::from).collect(),
            icrc_112_requests: None,
        }
    }

    pub fn from_with_tx(
        action: Action,
        intents: Vec<Intent>,
        tx_intent_hashmap: &HashMap<String, Vec<Transaction>>,
    ) -> Self {
        let intents_dto = intents
            .into_iter()
            .map(|intent| {
                let transactions = tx_intent_hashmap
                    .get(&intent.id)
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .map(TransactionDto::from)
                    .collect();
                let mut intent = IntentDto::from(intent);
                intent.transactions = transactions;
                intent
            })
            .collect();

        Self {
            id: action.id,
            r#type: action.r#type,
            state: action.state,
            creator: action.creator,
            intents: intents_dto,
            icrc_112_requests: None,
        }
    }

    pub fn build(action_data: &ActionData, icrc_112_requests: Option<Icrc112Requests>) -> Self {
        let intents = action_data.clone().intents;

        let intents_dto = intents
            .into_iter()
            .map(|intent| {
                // let transactions = intent_hashmap.get(&intent.id).unwrap();
                let intent_id = intent.id.clone();
                let mut intent_dto = IntentDto::from(intent);
                let txs = action_data
                    .intent_txs
                    .get(&intent_id)
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .map(TransactionDto::from)
                    .collect();

                intent_dto.transactions = txs;
                intent_dto
            })
            .collect();

        let action = action_data.action.clone();

        Self {
            id: action.id,
            r#type: action.r#type,
            state: action.state,
            creator: action.creator,
            intents: intents_dto,
            icrc_112_requests,
        }
    }
}

impl From<Wallet> for WalletDto {
    fn from(wallet: Wallet) -> Self {
        match wallet {
            Wallet::IC {
                address,
                subaccount,
            } => WalletDto::IC {
                address,
                subaccount,
            },
        }
    }
}

impl From<Asset> for AssetDto {
    fn from(asset: Asset) -> Self {
        Self { asset }
    }
}

impl From<Intent> for IntentDto {
    fn from(intent: Intent) -> Self {
        Self {
            id: intent.id,
            state: intent.state,
            created_at: intent.created_at,
            task: intent.task,
            chain: intent.chain,
            r#type: intent.r#type,
            transactions: Vec::new(),
        }
    }
}

impl From<Transaction> for TransactionDto {
    fn from(transaction: Transaction) -> Self {
        Self {
            id: transaction.id,
            created_at: transaction.created_at,
            state: transaction.state,
            dependency: transaction.dependency,
            group: transaction.group,
            from_call_type: transaction.from_call_type,
            protocol: transaction.protocol,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Icrc112Request {
    pub canister_id: Principal,
    pub method: String,
    pub arg: Vec<u8>,
    pub nonce: Option<Vec<u8>>,
}

pub type ParallelRequests = Vec<Icrc112Request>;

pub type SequenceRequest = Vec<ParallelRequests>;

pub type Icrc112Requests = SequenceRequest;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateActionInput {
    pub link_id: String,
    pub action_id: String,
    pub external: bool,
}
