use std::collections::HashMap;

use candid::CandidType;
use cashier_types::Intent;
use serde::{Deserialize, Serialize};

use crate::types::icrc_112_transaction::Icrc112Requests;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInput {
    pub action_type: String,
    pub params: Option<HashMap<String, String>>,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateActionInput {
    pub link_id: String,
    pub action_id: String,
    pub external: bool,
}

// #[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
// pub struct UpdateActionInput {
//     pub link_id: String,
//     pub action_id: String,
// }

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionInput {
    pub link_id: String,
    pub action_type: String,
    pub action_id: String,
    pub params: Option<HashMap<String, String>>,
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
    pub type_metadata: HashMap<String, TypeMetdataValue>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct WalletDto {
    pub address: String,
    pub chain: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub struct AssetDto {
    pub address: String,
    pub chain: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum TypeMetdataValue {
    String(String),
    U64(u64),
    Wallet(WalletDto),
    Asset(AssetDto),
}

impl ActionDto {
    pub fn from(action: cashier_types::Action, intents: Vec<Intent>) -> Self {
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

    pub fn build(
        action: cashier_types::Action,
        intents: Vec<Intent>,
        intent_hashmap: HashMap<String, Vec<cashier_types::Transaction>>,
        icrc_112_requests: Option<Icrc112Requests>,
    ) -> Self {
        let intents_dto = intents
            .into_iter()
            .map(|intent| {
                let transactions = intent_hashmap.get(&intent.id).unwrap();
                IntentDto::from(intent)
            })
            .collect();

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

impl From<cashier_types::Wallet> for WalletDto {
    fn from(wallet: cashier_types::Wallet) -> Self {
        Self {
            address: wallet.address,
            chain: wallet.chain.to_string(),
        }
    }
}

impl From<cashier_types::Asset> for AssetDto {
    fn from(asset: cashier_types::Asset) -> Self {
        Self {
            address: asset.address,
            chain: asset.chain.to_string(),
        }
    }
}

impl From<cashier_types::Intent> for IntentDto {
    fn from(intent: cashier_types::Intent) -> Self {
        let (r#type, type_metadata) = match intent.r#type {
            cashier_types::IntentType::Transfer(metadata) => {
                let mut type_metadata = HashMap::new();
                type_metadata.insert(
                    "from".to_string(),
                    TypeMetdataValue::Wallet(WalletDto::from(metadata.from)),
                );
                type_metadata.insert(
                    "to".to_string(),
                    TypeMetdataValue::Wallet(WalletDto::from(metadata.to)),
                );
                type_metadata.insert(
                    "asset".to_string(),
                    TypeMetdataValue::Asset(AssetDto::from(metadata.asset)),
                );
                type_metadata.insert("amount".to_string(), TypeMetdataValue::U64(metadata.amount));

                ("Transfer".to_string(), type_metadata)
            }
            cashier_types::IntentType::TransferFrom(metadata) => {
                let mut type_metadata = HashMap::new();
                type_metadata.insert(
                    "from".to_string(),
                    TypeMetdataValue::Wallet(WalletDto::from(metadata.from)),
                );
                type_metadata.insert(
                    "to".to_string(),
                    TypeMetdataValue::Wallet(WalletDto::from(metadata.to)),
                );
                type_metadata.insert(
                    "spender".to_string(),
                    TypeMetdataValue::Wallet(WalletDto::from(metadata.spender)),
                );
                type_metadata.insert(
                    "asset".to_string(),
                    TypeMetdataValue::Asset(AssetDto::from(metadata.asset)),
                );
                type_metadata.insert("amount".to_string(), TypeMetdataValue::U64(metadata.amount));

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
        }
    }
}
