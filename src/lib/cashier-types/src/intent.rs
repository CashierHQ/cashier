use candid::CandidType;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::common::{Chain, Wallet};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Intent {
    pub id: String,
    pub task: IntentTask,
    pub chain: Chain,
    pub from: Wallet,
    pub to: Wallet,
    pub asset: String,
    pub amount: u64,
    pub state: IntentState,
    pub dependency: Vec<String>, // Array of intent IDs
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum IntentTask {
    Transfer,
}

impl IntentTask {
    pub fn to_str(&self) -> &str {
        match self {
            IntentTask::Transfer => "Transfer",
        }
    }
}

impl FromStr for IntentTask {
    type Err = ();

    fn from_str(input: &str) -> Result<IntentTask, Self::Err> {
        match input {
            "Transfer" => Ok(IntentTask::Transfer),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum IntentState {
    Created,
    Processing,
    Success,
    Fail,
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
