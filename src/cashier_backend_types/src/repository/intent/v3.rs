// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use cashier_shared::types::{
    Intent as IntentShared, IntentState as IntentStateShared, IntentType as IntentTypeShared,
};
use ic_mple_structures::Codec;
use icrc_ledger_types::icrc1::account::Account;
use serde::{Deserialize, Serialize};

use crate::repository::{
    asset::v3::AssetV3,
    asset_info::v3::AssetInfoV3,
    common::AddressTypeV3,
    intent::v1::{IntentState, IntentType, TransferData, TransferFromData},
};

#[derive(Debug, Clone, PartialEq, Eq, Ord, PartialOrd)]
#[storable]
pub struct IntentV3 {
    pub id: String,
    pub label: String,
    pub intent_type: IntentTypeV3,
    pub asset: AssetV3,
    pub amount: Nat,
    pub total_amount: Option<Nat>,
    pub network_fee: Option<Nat>,
    pub user_fee: Option<Nat>,
    pub source_address: Principal,
    pub source_account: Option<Account>,
    pub source_address_type: AddressTypeV3,
    pub dest_address: Principal,
    pub dest_account: Option<Account>,
    pub dest_address_type: AddressTypeV3,
    pub intent_tx_data: Option<IntentTransactionDataV3>,
    pub dependencies: Vec<String>,
    pub action_id: String,
    pub state: IntentState,
    pub created_at: u64,
}

#[storable]
pub enum IntentCodecV3 {
    V1(IntentV3),
}

impl Codec<IntentV3> for IntentCodecV3 {
    fn decode(source: Self) -> IntentV3 {
        match source {
            IntentCodecV3::V1(link) => link,
        }
    }

    fn encode(dest: IntentV3) -> Self {
        IntentCodecV3::V1(dest)
    }
}

impl From<IntentShared> for IntentV3 {
    fn from(intent: IntentShared) -> Self {
        IntentV3 {
            id: intent.id,
            label: "".to_string(),
            intent_type: IntentTypeV3::from(intent.intent_type),
            asset: AssetV3::from(intent.asset),
            amount: intent.amount,
            total_amount: intent.total_amount,
            network_fee: intent.network_fee,
            user_fee: intent.user_fee,
            source_address: intent.source_address,
            source_account: None,
            source_address_type: AddressTypeV3::from(intent.source_address_type),
            dest_address: intent.dest_address,
            dest_account: None,
            dest_address_type: AddressTypeV3::from(intent.dest_address_type),
            intent_tx_data: None,
            dependencies: intent.dependencies.unwrap_or_default(),
            action_id: intent.action_id.unwrap_or_default(),
            state: IntentState::from(intent.intent_state),
            created_at: 0,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub enum IntentTypeV3 {
    Send,
    Receive,
}

impl From<IntentTypeShared> for IntentTypeV3 {
    fn from(intent_type: IntentTypeShared) -> Self {
        match intent_type {
            IntentTypeShared::Send => IntentTypeV3::Send,
            IntentTypeShared::Receive => IntentTypeV3::Receive,
        }
    }
}

impl IntentTypeV3 {
    pub fn to_shared(&self) -> IntentTypeShared {
        match self {
            IntentTypeV3::Send => IntentTypeShared::Send,
            IntentTypeV3::Receive => IntentTypeShared::Receive,
        }
    }
}

impl From<IntentStateShared> for IntentState {
    fn from(intent_state: IntentStateShared) -> Self {
        match intent_state {
            IntentStateShared::Created => IntentState::Created,
            IntentStateShared::Processing => IntentState::Processing,
            IntentStateShared::Success => IntentState::Success,
            IntentStateShared::Fail => IntentState::Fail,
        }
    }
}

impl IntentState {
    pub fn to_shared(&self) -> IntentStateShared {
        match self {
            IntentState::Created => IntentStateShared::Created,
            IntentState::Processing => IntentStateShared::Processing,
            IntentState::Success => IntentStateShared::Success,
            IntentState::Fail => IntentStateShared::Fail,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType, PartialEq, Eq, Ord, PartialOrd)]
pub enum IntentTransactionDataV3 {
    Transfer(TransferData),
    TransferFrom(TransferFromData),
}

impl IntentV3 {
    pub fn to_shared(&self) -> IntentShared {
        IntentShared {
            id: self.id.clone(),
            intent_type: self.intent_type.to_shared(),
            asset: self.asset.to_shared(),
            amount: self.amount.clone(),
            total_amount: self.total_amount.clone(),
            network_fee: self.network_fee.clone(),
            user_fee: self.user_fee.clone(),
            source_address: self.source_address,
            source_address_type: self.source_address_type.to_shared(),
            dest_address: self.dest_address,
            dest_address_type: self.dest_address_type.to_shared(),
            dependencies: Some(self.dependencies.clone()),
            action_id: Some(self.action_id.clone()),
            intent_state: self.state.to_shared(),
        }
    }

    pub fn from_asset_info(
        asset_info: &AssetInfoV3,
        intent_type: IntentTypeV3,
        source_address: Principal,
        source_account: Option<Account>,
        source_address_type: AddressTypeV3,
        dest_address: Principal,
        dest_account: Option<Account>,
        dest_address_type: AddressTypeV3,
        action_id: String,
        created_at: u64,
    ) -> Self {
        IntentV3 {
            id: "".to_string(),
            label: "".to_string(),
            intent_type,
            asset: asset_info.asset.clone(),
            amount: asset_info.amount.clone(),
            total_amount: Some(asset_info.amount.clone()),
            network_fee: None,
            user_fee: None,
            source_address,
            source_account,
            source_address_type,
            dest_address,
            dest_account,
            dest_address_type,
            intent_tx_data: None,
            dependencies: vec![],
            action_id,
            state: IntentState::Created,
            created_at,
        }
    }
}

/// Arguments for creating a TransferWalletToLink intent using ICRC2
pub struct CreateIcrc2WalletToLinkIntentArgs {
    pub label: String,
    pub asset: AssetV3,
    pub actual_amount: Nat,
    pub approval_amount: Nat,
    pub sender_id: Principal,
    pub spender_account: Account,
    pub receiver_id: Principal,
    pub link_account: Account,
    pub created_at_ts: u64,
}

/// Arguments for creating a TransferWalletToLink intent using ICRC1
pub struct CreateIcrc1WalletToLinkIntentArgs {
    pub label: String,
    pub asset: AssetV3,
    pub sending_amount: Nat,
    pub sender_id: Principal,
    pub receiver_id: Principal,
    pub link_account: Account,
    pub created_at_ts: u64,
}

/// Arguments for creating a TransferWalletToTreasury intent using ICRC2
pub struct CreateWalletToTreasuryIntentArgs {
    pub label: String,
    pub asset: AssetV3,
    pub actual_amount: Nat,
    pub approval_amount: Nat,
    pub sender_id: Principal,
    pub spender_account: Account,
    pub receiver_id: Principal,
    pub created_at_ts: u64,
}

/// Arguments for creating a TransferLinkToWallet intent
pub struct CreateLinkToWalletIntentArgs {
    pub label: String,
    pub asset: AssetV3,
    pub sending_amount: Nat,
    pub receiver_id: Principal,
    pub source_address: Principal,
    pub link_account: Account,
    pub created_at_ts: u64,
}
