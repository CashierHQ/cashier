// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! # Intent v1 Module (DEPRECATED)
//!
//! **⚠️ DEPRECATED**: This module is deprecated as of version 2.0.0.
//! Please use `crate::intent::v2` instead.
//!
//! ## Migration Guide
//! - v1 uses `u64` for amounts, v2 uses `Nat` which better supports blockchain operations
//! - `IntentTask::TransferPayment` has been removed in v2
//! - All other functionality remains the same
//!
//! ## Usage
//! ```rust
//! // ❌ Old (deprecated)
//! use crate::intent::v1::Intent;
//!
//! // ✅ New (recommended)  
//! use crate::intent::v2::Intent;
//! ```

use candid::CandidType;
use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

use crate::common::{Asset, Chain, Wallet};

#[deprecated(
    since = "2.0.0",
    note = "Use Intent from v2 module instead. v1 Intent uses u64 for amounts, while v2 uses Nat which better supports blockchain operations."
)]
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

#[deprecated(since = "2.0.0", note = "Use IntentState from v2 module instead")]
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum IntentState {
    Created,
    Processing,
    Success,
    Fail,
}

#[deprecated(
    since = "2.0.0",
    note = "Use IntentType from v2 module instead. v2 uses Nat for amounts instead of u64."
)]
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
            actual_amount: None,
            approve_amount: None,
        })
    }
}

#[deprecated(
    since = "2.0.0",
    note = "Use TransferData from v2 module instead. v2 uses Nat for amount instead of u64."
)]
#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub struct TransferData {
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: u64,
}

#[deprecated(
    since = "2.0.0",
    note = "Use TransferFromData from v2 module instead. v2 uses Nat for amounts instead of u64."
)]
#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub struct TransferFromData {
    pub from: Wallet,
    pub to: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    // number without deduct fee
    pub amount: u64,
    // number with deduct fee
    pub actual_amount: Option<u64>,
    // approve amount for transfer from
    pub approve_amount: Option<u64>,
}

#[deprecated(
    since = "2.0.0",
    note = "Use IntentTask from v2 module instead. TransferPayment variant has been removed in v2."
)]
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum IntentTask {
    TransferWalletToTreasury,
    TransferWalletToLink,
    TransferLinkToWallet,
    // deprecated
    TransferPayment,
}

impl fmt::Display for IntentTask {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl IntentTask {
    pub fn to_str(&self) -> &str {
        match self {
            IntentTask::TransferWalletToTreasury => "transfer_wallet_to_treasury",
            IntentTask::TransferWalletToLink => "transfer_wallet_to_link",
            IntentTask::TransferLinkToWallet => "transfer_link_to_wallet",
            IntentTask::TransferPayment => "transfer_wallet_to_link",
        }
    }
}

impl FromStr for IntentTask {
    type Err = ();

    fn from_str(input: &str) -> Result<IntentTask, Self::Err> {
        match input {
            "transfer_wallet_to_treasury" => Ok(IntentTask::TransferWalletToTreasury),
            "transfer_wallet_to_link" => Ok(IntentTask::TransferWalletToLink),
            "transfer_link_to_wallet" => Ok(IntentTask::TransferLinkToWallet),
            "transfer_payment" => Ok(IntentTask::TransferWalletToLink),
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
