// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat};
use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

use crate::common::{Asset, Chain, Wallet};

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

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Ord, PartialOrd)]
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

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum IntentTask {
    TransferWalletToTreasury,
    TransferWalletToLink,
    TransferLinkToWallet,
}

impl IntentTask {
    pub fn to_str(&self) -> &str {
        match self {
            IntentTask::TransferWalletToTreasury => "transfer_wallet_to_treasury",
            IntentTask::TransferWalletToLink => "transfer_wallet_to_link",
            IntentTask::TransferLinkToWallet => "transfer_link_to_wallet",
        }
    }
}

impl fmt::Display for IntentTask {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl FromStr for IntentTask {
    type Err = ();

    fn from_str(input: &str) -> Result<IntentTask, Self::Err> {
        match input {
            "transfer_wallet_to_treasury" => Ok(IntentTask::TransferWalletToTreasury),
            "transfer_wallet_to_link" => Ok(IntentTask::TransferWalletToLink),
            "transfer_link_to_wallet" => Ok(IntentTask::TransferLinkToWallet),
            _ => Err(()),
        }
    }
}

impl IntentState {
    pub fn to_str(&self) -> &str {
        match self {
            IntentState::Created => "Intent_state_created",
            IntentState::Processing => "Intent_state_processing",
            IntentState::Success => "Intent_state_success",
            IntentState::Fail => "Intent_state_fail",
        }
    }
}

impl fmt::Display for IntentState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl FromStr for IntentState {
    type Err = ();

    fn from_str(input: &str) -> Result<IntentState, Self::Err> {
        match input {
            "Intent_state_created" => Ok(IntentState::Created),
            "Intent_state_processing" => Ok(IntentState::Processing),
            "Intent_state_success" => Ok(IntentState::Success),
            "Intent_state_fail" => Ok(IntentState::Fail),
            _ => Err(()),
        }
    }
}
