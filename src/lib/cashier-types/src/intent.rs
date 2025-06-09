// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use candid::CandidType;
use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::{
    common::{Chain, Wallet},
    Asset,
};

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
                amount: 0,
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
            amount: 0,
        })
    }

    pub fn default_transfer_from() -> Self {
        IntentType::TransferFrom(TransferFromData {
            from: Wallet::default(),
            to: Wallet::default(),
            spender: Wallet::default(),
            asset: Asset::default(),
            amount: 0,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub struct TransferData {
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub struct TransferFromData {
    pub from: Wallet,
    pub to: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum IntentTask {
    TransferWalletToTreasury,
    TransferWalletToLink,
    TransferLinkToWallet,
}

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
#[storable]
pub struct IntentTransaction {
    pub intent_id: String,
    pub transaction_id: String,
}

impl IntentTask {
    pub fn to_str(&self) -> &str {
        match self {
            IntentTask::TransferWalletToTreasury => "transfer_wallet_to_treasury",
            IntentTask::TransferWalletToLink => "transfer_wallet_to_link",
            IntentTask::TransferLinkToWallet => "transfer_link_to_wallet",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
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

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
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
