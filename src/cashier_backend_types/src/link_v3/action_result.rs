use crate::{dto::action::Icrc112Requests, repository::transaction::v1::Transaction};
use cashier_shared::types::Action as ActionShared;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CreateActionResult {
    pub action: ActionShared,
    pub icrc112_requests: Option<Icrc112Requests>,
}

#[derive(Debug, Clone)]
pub struct ProcessActionResult {
    pub action: ActionShared,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
    pub is_success: bool,
    pub errors: Vec<String>,
}
