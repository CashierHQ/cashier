// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
use serde::{Deserialize, Serialize};

use crate::repository::common::{Asset, Chain, Wallet};

#[derive(Debug, Clone, PartialEq, Eq, Ord, PartialOrd)]
#[storable]
pub struct Intent {
    pub id: String,
    pub state: IntentState,
    pub created_at: u64,
    pub dependency: Vec<String>,
    pub chain: Chain,
    pub task: IntentTask,
    pub r#type: IntentType,
    pub label: String,
}

#[storable]
pub enum IntentCodec {
    V1(Intent),
}

impl Codec<Intent> for IntentCodec {
    fn decode(source: Self) -> Intent {
        match source {
            IntentCodec::V1(link) => link,
        }
    }

    fn encode(dest: Intent) -> Self {
        IntentCodec::V1(dest)
    }
}

impl Default for Intent {
    fn default() -> Self {
        Self {
            id: "".to_string(),
            state: IntentState::Created,
            created_at: 0,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(0u64),
            }),
            label: "".to_string(),
        }
    }
}

#[derive(
    Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Ord, PartialOrd, Display,
)]
pub enum IntentState {
    Created,
    Processing,
    Success,
    Fail,
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub enum IntentType {
    Transfer(TransferData),
    TransferFrom(TransferFromData),
}

impl IntentType {
    pub fn try_get_asset(&self) -> Option<Asset> {
        match self {
            IntentType::Transfer(data) => Some(data.asset.clone()),
            IntentType::TransferFrom(data) => Some(data.asset.clone()),
        }
    }
    pub fn as_transfer(&self) -> Option<TransferData> {
        match self {
            IntentType::Transfer(data) => Some(data.clone()),
            _ => None,
        }
    }

    pub fn as_transfer_from(&self) -> Option<TransferFromData> {
        match self {
            IntentType::TransferFrom(data) => Some(data.clone()),
            _ => None,
        }
    }

    pub fn default_transfer() -> Self {
        IntentType::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(0u64),
        })
    }

    pub fn default_transfer_from() -> Self {
        IntentType::TransferFrom(TransferFromData {
            from: Wallet::default(),
            to: Wallet::default(),
            spender: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(0u64),
            actual_amount: None,
            approve_amount: None,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub struct TransferData {
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: Nat,
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub struct TransferFromData {
    pub from: Wallet,
    pub to: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    // number without deduct fee
    pub amount: Nat,
    // number with deduct fee
    pub actual_amount: Option<Nat>,
    // approve amount for transfer from
    pub approve_amount: Option<Nat>,
}

#[derive(
    Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Ord, PartialOrd, Display,
)]
pub enum IntentTask {
    TransferWalletToTreasury,
    TransferWalletToLink,
    TransferLinkToWallet,
}
