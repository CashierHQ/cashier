use crate::repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CreateActionResult {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
}
