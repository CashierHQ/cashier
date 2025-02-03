use candid::CandidType;
use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::{
    common::{Chain, Wallet},
    Asset,
};

#[derive(Debug, Clone)]
#[storable]
pub struct Intent {
    pub id: String,
    pub state: IntentState,
    pub created_at: u64,
    pub dependency: Vec<String>,
    pub chain: Chain,
    pub task: IntentTask,
    pub r#type: IntentType,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum IntentState {
    Created,
    Processing,
    Success,
    Fail,
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub enum IntentType {
    Transfer(TransferIntent),
    TransferFrom(TransferFromIntent),
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub struct TransferIntent {
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, CandidType)]
pub struct TransferFromIntent {
    pub from: Wallet,
    pub to: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum IntentTask {
    TransferWalletToTreasury,
    TransferWalletToLink,
}

#[derive(Debug, Clone)]
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
