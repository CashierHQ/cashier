// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
use icrc_ledger_types::icrc1::account::Account;
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

/// Defaults for fields not in generated type:
/// chain=IC, task=TransferWalletToTreasury, label="", created_at=0
impl From<cashier_shared::Intent> for Intent {
    fn from(value: cashier_shared::Intent) -> Self {
        let from = Wallet::new(value.source_address);
        let to = Wallet::new(value.dest_address);
        let asset = Asset::IC {
            address: value.asset.address,
        };

        Intent {
            id: value.id,
            state: value.intent_state.into(),
            created_at: 0,
            dependency: value.dependencies.unwrap_or_default(),
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData {
                from,
                to,
                asset,
                amount: value.amount,
            }),
            label: String::new(),
        }
    }
}

impl Intent {
    /// Convert to generated Intent. Requires context not stored in repo type.
    pub fn into_generated(
        self,
        source_address_type: cashier_shared::AddressType,
        dest_address_type: cashier_shared::AddressType,
        token_standard: cashier_shared::TokenStandard,
    ) -> cashier_shared::Intent {
        let (from_addr, to_addr, asset_addr, amount) = match &self.r#type {
            IntentType::Transfer(d) => extract_wallet_fields(&d.from, &d.to, &d.asset, &d.amount),
            IntentType::TransferFrom(d) => {
                extract_wallet_fields(&d.from, &d.to, &d.asset, &d.amount)
            }
        };

        cashier_shared::Intent {
            id: self.id,
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
                Some(self.dependency)
            },
            intent_state: self.state.into_generated(),
        }
    }
}

/// Extract Principal addresses from Wallet/Asset for generated type construction
fn extract_wallet_fields(
    from: &Wallet,
    to: &Wallet,
    asset: &Asset,
    amount: &Nat,
) -> (Principal, Principal, Principal, Nat) {
    let from_addr = match from {
        Wallet::IC { address, .. } => *address,
    };
    let to_addr = match to {
        Wallet::IC { address, .. } => *address,
    };
    let asset_addr = match asset {
        Asset::IC { address } => *address,
    };
    (from_addr, to_addr, asset_addr, amount.clone())
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
