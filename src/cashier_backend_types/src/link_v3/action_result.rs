// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::HashMap;

use crate::{
    dto::action::Icrc112Requests,
    repository::{action::v3::ActionV3, intent::v3::IntentV3, transaction::v1::Transaction},
};

#[derive(Debug, Clone)]
pub struct CreateActionResult {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
}

#[derive(Debug, Clone)]
pub struct ProcessActionResult {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
    pub is_success: bool,
    pub errors: Vec<String>,
}
