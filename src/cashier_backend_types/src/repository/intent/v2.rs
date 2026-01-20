// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_macros::storable;

use crate::repository::common::{Asset, Chain, Wallet};

use super::v1::{IntentState, IntentTask, IntentType, TransferData};

/// Intent V2 - with fee calculation fields
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
    // V2 fields - fee calculation
    pub intent_total_amount: Option<Nat>,
    pub intent_total_network_fee: Option<Nat>,
    pub intent_user_fee: Option<Nat>,
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
            intent_total_amount: None,
            intent_total_network_fee: None,
            intent_user_fee: None,
        }
    }
}

impl From<super::v1::Intent> for Intent {
    fn from(v1: super::v1::Intent) -> Self {
        Intent {
            id: v1.id,
            state: v1.state,
            created_at: v1.created_at,
            dependency: v1.dependency,
            chain: v1.chain,
            task: v1.task,
            r#type: v1.r#type,
            label: v1.label,
            intent_total_amount: None,
            intent_total_network_fee: None,
            intent_user_fee: None,
        }
    }
}
