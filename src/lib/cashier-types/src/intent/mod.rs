// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// Generated versioned enum for Intent

use candid::Nat;
use cashier_macros::storable;

pub mod v1;
pub mod v2;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedIntent {
    V1(v1::Intent),
    V2(v2::Intent),
}

impl VersionedIntent {
    /// Build a versioned intent from version number and data
    pub fn build(version: u32, intent: v1::Intent) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedIntent::V1(intent)),
            2 => Ok(VersionedIntent::V2(Self::convert_v1_to_v2(intent))),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    pub fn build_v2(intent: v2::Intent) -> Result<Self, String> {
        Ok(VersionedIntent::V2(intent))
    }

    /// Get the version number of this versioned intent
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedIntent::V1(_) => 1,
            VersionedIntent::V2(_) => 2,
        }
    }

    /// Get the ID from the versioned intent
    pub fn get_id(&self) -> String {
        match self {
            VersionedIntent::V1(intent) => intent.id.clone(),
            VersionedIntent::V2(intent) => intent.id.clone(),
        }
    }

    /// Convert to the latest Intent format
    pub fn into_intent(self) -> v1::Intent {
        match self {
            VersionedIntent::V1(intent) => intent,
            VersionedIntent::V2(intent) => Self::convert_v2_to_v1(intent),
        }
    }

    /// Convert to V2 Intent format
    pub fn to_v2(self) -> v2::Intent {
        match self {
            VersionedIntent::V1(intent) => Self::convert_v1_to_v2(intent),
            VersionedIntent::V2(intent) => intent,
        }
    }

    /// Convert V1 Intent to V2 Intent
    pub fn convert_v1_to_v2(v1_intent: v1::Intent) -> v2::Intent {
        v2::Intent {
            id: v1_intent.id,
            state: match v1_intent.state {
                v1::IntentState::Created => v2::IntentState::Created,
                v1::IntentState::Processing => v2::IntentState::Processing,
                v1::IntentState::Success => v2::IntentState::Success,
                v1::IntentState::Fail => v2::IntentState::Fail,
            },
            created_at: v1_intent.created_at,
            dependency: v1_intent.dependency,
            chain: v1_intent.chain,
            task: match v1_intent.task {
                v1::IntentTask::TransferWalletToTreasury => {
                    v2::IntentTask::TransferWalletToTreasury
                }
                v1::IntentTask::TransferWalletToLink => v2::IntentTask::TransferWalletToLink,
                v1::IntentTask::TransferLinkToWallet => v2::IntentTask::TransferLinkToWallet,
                v1::IntentTask::TransferPayment => v2::IntentTask::TransferWalletToLink,
            },
            r#type: match v1_intent.r#type {
                v1::IntentType::Transfer(transfer_data) => {
                    v2::IntentType::Transfer(v2::TransferData {
                        from: transfer_data.from,
                        to: transfer_data.to,
                        asset: transfer_data.asset,
                        amount: Nat::from(transfer_data.amount),
                    })
                }
                v1::IntentType::TransferFrom(transfer_from_data) => {
                    v2::IntentType::TransferFrom(v2::TransferFromData {
                        from: transfer_from_data.from,
                        to: transfer_from_data.to,
                        spender: transfer_from_data.spender,
                        asset: transfer_from_data.asset,
                        amount: Nat::from(transfer_from_data.amount),
                        actual_amount: transfer_from_data.actual_amount.map(Nat::from),
                        approve_amount: transfer_from_data.approve_amount.map(Nat::from),
                    })
                }
            },
            label: v1_intent.label,
        }
    }

    /// Convert V2 Intent to V1 Intent
    pub fn convert_v2_to_v1(v2_intent: v2::Intent) -> v1::Intent {
        v1::Intent {
            id: v2_intent.id,
            state: match v2_intent.state {
                v2::IntentState::Created => v1::IntentState::Created,
                v2::IntentState::Processing => v1::IntentState::Processing,
                v2::IntentState::Success => v1::IntentState::Success,
                v2::IntentState::Fail => v1::IntentState::Fail,
            },
            created_at: v2_intent.created_at,
            dependency: v2_intent.dependency,
            chain: v2_intent.chain,
            task: match v2_intent.task {
                v2::IntentTask::TransferWalletToTreasury => {
                    v1::IntentTask::TransferWalletToTreasury
                }
                v2::IntentTask::TransferWalletToLink => v1::IntentTask::TransferWalletToLink,
                v2::IntentTask::TransferLinkToWallet => v1::IntentTask::TransferLinkToWallet,
            },
            r#type: match v2_intent.r#type {
                v2::IntentType::Transfer(transfer_data) => {
                    v1::IntentType::Transfer(v1::TransferData {
                        from: transfer_data.from,
                        to: transfer_data.to,
                        asset: transfer_data.asset,
                        amount: 0,
                    })
                }
                v2::IntentType::TransferFrom(transfer_from_data) => {
                    v1::IntentType::TransferFrom(v1::TransferFromData {
                        from: transfer_from_data.from,
                        to: transfer_from_data.to,
                        spender: transfer_from_data.spender,
                        asset: transfer_from_data.asset,
                        amount: 0,
                        actual_amount: Some(0),
                        approve_amount: Some(0),
                    })
                }
            },
            label: v2_intent.label,
        }
    }
}
