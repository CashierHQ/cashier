// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
use icrc_ledger_types::icrc1::account::Account;
use serde::{Deserialize, Serialize};

use crate::repository::action::v1::Action;
use crate::repository::common::{Asset, Chain, Wallet};
use crate::utils::extract_wallet_fields;

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

// --- From<cashier_shared> impls ---

impl From<cashier_shared::IntentState> for IntentState {
    fn from(state: cashier_shared::IntentState) -> Self {
        match state {
            cashier_shared::IntentState::Created => IntentState::Created,
            cashier_shared::IntentState::Processing => IntentState::Processing,
            cashier_shared::IntentState::Success => IntentState::Success,
            cashier_shared::IntentState::Failed => IntentState::Fail,
        }
    }
}

impl IntentState {
    pub fn into_generated(self) -> cashier_shared::IntentState {
        match self {
            IntentState::Created => cashier_shared::IntentState::Created,
            IntentState::Processing => cashier_shared::IntentState::Processing,
            IntentState::Success => cashier_shared::IntentState::Success,
            IntentState::Fail => cashier_shared::IntentState::Failed,
        }
    }
}

impl Intent {
    /// Create repo Intent from `cashier_shared::Intent`.
    ///
    /// # Arguments
    /// * `value` - Source generated Intent
    /// * `chain` - Blockchain network
    /// * `task` - Intent task type
    /// * `label` - Display label
    /// * `created_at` - Creation timestamp
    ///
    /// # Returns
    /// Repo Intent with all fields explicitly set
    pub fn from_generated(
        value: cashier_shared::Intent,
        chain: Chain,
        label: String,
        created_at: u64,
    ) -> Self {
        let from = Wallet::new(value.source_address);
        let to = Wallet::new(value.dest_address);
        let asset = Asset::IC {
            address: value.asset.address,
        };
        let intent_task: IntentTask = match (value.source_address_type, value.dest_address_type) {
            (cashier_shared::AddressType::Creator, cashier_shared::AddressType::Treasury) => {
                IntentTask::TransferWalletToTreasury
            }
            (cashier_shared::AddressType::Creator, cashier_shared::AddressType::Link)
            | (cashier_shared::AddressType::User, cashier_shared::AddressType::Link) => {
                IntentTask::TransferWalletToLink
            }
            (cashier_shared::AddressType::Link, cashier_shared::AddressType::Creator)
            | (cashier_shared::AddressType::Link, cashier_shared::AddressType::User) => {
                IntentTask::TransferLinkToWallet
            }
            _ => IntentTask::TransferWalletToTreasury,
        };

        Intent {
            id: value.id,
            state: value.intent_state.into(),
            created_at,
            dependency: value.dependencies.unwrap_or_default(),
            chain,
            task: intent_task,
            r#type: IntentType::Transfer(TransferData {
                from,
                to,
                asset,
                amount: value.amount,
            }),
            label,
        }
    }

    /// Convert repo Intent to `cashier_shared::Intent`.
    ///
    /// # Arguments
    /// * `source_address_type` - Type of source address (Creator/User/Treasury/Link)
    /// * `dest_address_type` - Type of destination address
    /// * `token_standard` - Token standard (ICRC1/ICRC2)
    ///
    /// # Returns
    /// `cashier_shared::Intent` with transfer data extracted from repo type
    pub fn into_generated(&self, action: Action) -> cashier_shared::Intent {
        let (from_addr, to_addr, asset_addr, amount) = match &self.r#type {
            IntentType::Transfer(d) => extract_wallet_fields(&d.from, &d.to, &d.asset, &d.amount),
            IntentType::TransferFrom(d) => {
                extract_wallet_fields(&d.from, &d.to, &d.asset, &d.amount)
            }
        };

        let (source_address_type, dest_address_type) = match action.r#type {
            crate::repository::action::v1::ActionType::CreateLink => (
                cashier_shared::AddressType::Creator,
                cashier_shared::AddressType::Link,
            ),
            crate::repository::action::v1::ActionType::Withdraw => (
                cashier_shared::AddressType::Link,
                cashier_shared::AddressType::Creator,
            ),
            crate::repository::action::v1::ActionType::Send => (
                cashier_shared::AddressType::User,
                cashier_shared::AddressType::Link,
            ),
            crate::repository::action::v1::ActionType::Receive => (
                cashier_shared::AddressType::Link,
                cashier_shared::AddressType::User,
            ),
        };
        let token_standard = match &self.r#type {
            IntentType::Transfer(_d) => cashier_shared::TokenStandard::ICRC1,
            IntentType::TransferFrom(_d) => cashier_shared::TokenStandard::ICRC2,
        };

        cashier_shared::Intent {
            id: self.id.clone(),
            intent_type: cashier_shared::IntentType::Transfer,
            asset: cashier_shared::Asset {
                address: asset_addr,
                token_standard: token_standard.clone(),
            },
            amount,
            source_address: from_addr,
            source_address_type,
            dest_address: to_addr,
            dest_address_type,
            intent_token_standard: token_standard,
            dependencies: if self.dependency.is_empty() {
                None
            } else {
                Some(self.dependency.clone())
            },
            intent_state: self.state.clone().into_generated(),
        }
    }
}

/// Arguments for creating a TransferWalletToLink intent using ICRC2
pub struct CreateIcrc2WalletToLinkIntentArgs {
    pub label: String,
    pub asset: Asset,
    pub actual_amount: Nat,
    pub approval_amount: Nat,
    pub sender_id: Principal,
    pub spender_account: Account,
    pub link_account: Account,
    pub created_at_ts: u64,
}

/// Arguments for creating a TransferWalletToLink intent using ICRC1
pub struct CreateIcrc1WalletToLinkIntentArgs {
    pub label: String,
    pub asset: Asset,
    pub sending_amount: Nat,
    pub sender_id: Principal,
    pub link_account: Account,
    pub created_at_ts: u64,
}

/// Arguments for creating a TransferWalletToTreasury intent using ICRC2
pub struct CreateWalletToTreasuryIntentArgs {
    pub label: String,
    pub asset: Asset,
    pub actual_amount: Nat,
    pub approval_amount: Nat,
    pub sender_id: Principal,
    pub spender_account: Account,
    pub created_at_ts: u64,
}

/// Arguments for creating a TransferLinkToWallet intent
pub struct CreateLinkToWalletIntentArgs {
    pub label: String,
    pub asset: Asset,
    pub sending_amount: Nat,
    pub receiver_id: Principal,
    pub link_account: Account,
    pub created_at_ts: u64,
}
