use std::collections::HashMap;

use crate::repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction};

#[derive(Debug, Clone)]
pub struct ValidateActionTransactionsResult {
    pub wallet_transactions: Vec<Transaction>,
    pub canister_transactions: Vec<Transaction>,
    pub is_success: bool,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ExecuteTransactionsResult {
    pub transactions: Vec<Transaction>,
    pub is_success: bool,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct RollupActionStateResult {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
}
