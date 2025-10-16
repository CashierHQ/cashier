use crate::{
    dto::action::Icrc112Requests,
    repository::{action::v1::Action, intent::v2::Intent, transaction::v2::Transaction},
};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CreateActionResult {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
}
