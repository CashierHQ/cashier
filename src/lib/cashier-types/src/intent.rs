use serde::{Deserialize, Serialize};

use crate::common::{Chain, Wallet};

#[derive(Serialize, Deserialize, Debug, Clone)]
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum IntentTask {
    Transfer,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum IntentState {
    Created,
    Processing,
    Success,
    Fail,
    Timeout,
}
