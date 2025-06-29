// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::HashMap;

use candid::{CandidType, Nat};
use cashier_types::{
    action::v1::Action,
    intent::v2::{Intent, IntentType},
    transaction::v2::{IcTransaction, Protocol, Transaction},
};
use icrc_ledger_types::icrc1::transfer::Memo;
use serde::{Deserialize, Serialize};

use crate::types::{icrc_112_transaction::Icrc112Requests, transaction_manager::ActionData};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInput {
    pub link_id: String,
    pub action_type: String,
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
    pub action_type: String,
    pub action_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionAnonymousInput {
    pub link_id: String,
    pub action_type: String,
    pub action_id: String,
    pub wallet_address: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionAnonymousInput {
    pub link_id: String,
    pub action_type: String,
    pub wallet_address: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ClaimIntentParams {
    address: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum CreateActionParams {
    Claim(ClaimIntentParams),
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ConfirmActionInput {
    pub action_id: String,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionResponse {
    pub action: ActionDto,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ActionDto {
    pub id: String,
    pub r#type: String,
    pub state: String,
    pub creator: String,
    pub intents: Vec<IntentDto>,
    pub icrc_112_requests: Option<Icrc112Requests>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct IntentDto {
    pub id: String,
    pub state: String,
    pub created_at: u64,
    pub chain: String,
    pub task: String,
    pub r#type: String,
    pub type_metadata: HashMap<String, MetadataValue>,
    pub transactions: Vec<TransactionDto>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct TransactionDto {
    pub id: String,
    pub created_at: u64,
    pub state: String,
    pub dependency: Option<Vec<String>>,
    pub group: u16,
    pub from_call_type: String,
    pub protocol: String,
    pub protocol_metadata: HashMap<String, MetadataValue>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]
pub struct WalletDto {
    pub address: String,
    pub chain: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]

pub struct AssetDto {
    pub address: String,
    pub chain: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]
pub enum MetadataValue {
    String(String),
    U64(u64),
    Nat(Nat),
    MaybeNat(Option<Nat>),
    Wallet(WalletDto),
    Asset(AssetDto),
    MaybeMemo(Option<Memo>),
}

impl ActionDto {
    pub fn from(action: Action, intents: Vec<Intent>) -> Self {
        let intents_dto = intents
            .into_iter()
            .map(|intent| IntentDto::from(intent))
            .collect();
        Self {
            id: action.id,
            r#type: action.r#type.to_string(),
            state: action.state.to_string(),
            creator: action.creator,
            intents: intents_dto,
            icrc_112_requests: None,
        }
    }

    pub fn from_with_tx(
        action: Action,
        intents: Vec<Intent>,
        tx_intent_hashmap: HashMap<String, Vec<Transaction>>,
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
            r#type: action.r#type.to_string(),
            state: action.state.to_string(),
            creator: action.creator,
            intents: intents_dto,
            icrc_112_requests: None,
        }
    }

    pub fn build(action_data: &ActionData, icrc_112_requests: Option<Icrc112Requests>) -> Self {
        let intents = action_data.clone().intents.clone();

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
            r#type: action.r#type.to_string(),
            state: action.state.to_string(),
            creator: action.creator,
            intents: intents_dto,
            icrc_112_requests,
        }
    }
}

impl From<cashier_types::common::Wallet> for WalletDto {
    fn from(wallet: cashier_types::common::Wallet) -> Self {
        Self {
            address: wallet.address,
            chain: wallet.chain.to_string(),
        }
    }
}

impl From<cashier_types::common::Asset> for AssetDto {
    fn from(asset: cashier_types::common::Asset) -> Self {
        Self {
            address: asset.address,
            chain: asset.chain.to_string(),
        }
    }
}

impl From<Intent> for IntentDto {
    fn from(intent: Intent) -> Self {
        let (r#type, type_metadata) = match intent.r#type {
            IntentType::Transfer(metadata) => {
                let mut type_metadata = HashMap::new();
                type_metadata.insert(
                    "from".to_string(),
                    MetadataValue::Wallet(WalletDto::from(metadata.from)),
                );
                type_metadata.insert(
                    "to".to_string(),
                    MetadataValue::Wallet(WalletDto::from(metadata.to)),
                );
                type_metadata.insert(
                    "asset".to_string(),
                    MetadataValue::Asset(AssetDto::from(metadata.asset)),
                );
                type_metadata.insert("amount".to_string(), MetadataValue::Nat(metadata.amount));

                ("Transfer".to_string(), type_metadata)
            }
            IntentType::TransferFrom(metadata) => {
                let mut type_metadata = HashMap::new();
                type_metadata.insert(
                    "from".to_string(),
                    MetadataValue::Wallet(WalletDto::from(metadata.from)),
                );
                type_metadata.insert(
                    "to".to_string(),
                    MetadataValue::Wallet(WalletDto::from(metadata.to)),
                );
                type_metadata.insert(
                    "spender".to_string(),
                    MetadataValue::Wallet(WalletDto::from(metadata.spender)),
                );
                type_metadata.insert(
                    "asset".to_string(),
                    MetadataValue::Asset(AssetDto::from(metadata.asset)),
                );
                type_metadata.insert("amount".to_string(), MetadataValue::Nat(metadata.amount));
                type_metadata.insert(
                    "approve_amount".to_string(),
                    MetadataValue::MaybeNat(metadata.approve_amount),
                );

                ("TransferFrom".to_string(), type_metadata)
            }
        };

        Self {
            id: intent.id,
            state: intent.state.to_string(),
            created_at: intent.created_at,
            task: intent.task.to_string(),
            chain: intent.chain.to_string(),
            r#type,
            type_metadata,
            transactions: Vec::new(),
        }
    }
}

impl From<Transaction> for TransactionDto {
    fn from(transaction: Transaction) -> Self {
        let protocol = transaction.get_tx_type();
        let mut protocol_metadata = HashMap::new();
        match transaction.protocol {
            Protocol::IC(ic_transaction) => match ic_transaction {
                IcTransaction::Icrc1Transfer(icrc1_transfer) => {
                    protocol_metadata.insert(
                        "from".to_string(),
                        MetadataValue::Wallet(WalletDto::from(icrc1_transfer.from)),
                    );
                    protocol_metadata.insert(
                        "to".to_string(),
                        MetadataValue::Wallet(WalletDto::from(icrc1_transfer.to)),
                    );
                    protocol_metadata.insert(
                        "asset".to_string(),
                        MetadataValue::Asset(AssetDto::from(icrc1_transfer.asset)),
                    );
                    protocol_metadata.insert(
                        "amount".to_string(),
                        MetadataValue::Nat(icrc1_transfer.amount),
                    );
                    protocol_metadata.insert(
                        "memo".to_string(),
                        MetadataValue::MaybeMemo(icrc1_transfer.memo),
                    );
                }
                IcTransaction::Icrc2Approve(icrc2_approve) => {
                    protocol_metadata.insert(
                        "from".to_string(),
                        MetadataValue::Wallet(WalletDto::from(icrc2_approve.from)),
                    );
                    protocol_metadata.insert(
                        "spender".to_string(),
                        MetadataValue::Wallet(WalletDto::from(icrc2_approve.spender)),
                    );
                    protocol_metadata.insert(
                        "asset".to_string(),
                        MetadataValue::Asset(AssetDto::from(icrc2_approve.asset)),
                    );
                    protocol_metadata.insert(
                        "amount".to_string(),
                        MetadataValue::Nat(icrc2_approve.amount),
                    );
                }
                IcTransaction::Icrc2TransferFrom(icrc2_transfer_from) => {
                    protocol_metadata.insert(
                        "from".to_string(),
                        MetadataValue::Wallet(WalletDto::from(icrc2_transfer_from.from)),
                    );
                    protocol_metadata.insert(
                        "spender".to_string(),
                        MetadataValue::Wallet(WalletDto::from(icrc2_transfer_from.spender)),
                    );
                    protocol_metadata.insert(
                        "to".to_string(),
                        MetadataValue::Wallet(WalletDto::from(icrc2_transfer_from.to)),
                    );
                    protocol_metadata.insert(
                        "asset".to_string(),
                        MetadataValue::Asset(AssetDto::from(icrc2_transfer_from.asset)),
                    );
                    protocol_metadata.insert(
                        "amount".to_string(),
                        MetadataValue::Nat(icrc2_transfer_from.amount),
                    );
                    protocol_metadata.insert(
                        "memo".to_string(),
                        MetadataValue::MaybeMemo(icrc2_transfer_from.memo),
                    );
                }
            },
        }

        Self {
            id: transaction.id,
            created_at: transaction.created_at,
            state: transaction.state.to_string(),
            dependency: transaction.dependency,
            group: transaction.group,
            from_call_type: transaction.from_call_type.to_string(),
            protocol,
            protocol_metadata,
        }
    }
}
