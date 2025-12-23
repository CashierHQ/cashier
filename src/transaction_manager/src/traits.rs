// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use std::{collections::HashMap, future::Future, pin::Pin};

pub trait TransactionManager {
    /// Create action transactions if necessary and assemble ICRC-112 requests for the given action and intents
    /// # Arguments
    /// * `action` - The action for which transactions are to be created
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - An optional mapping of intent IDs to their corresponding transactions
    /// # Returns
    /// * `CreateActionResult` - The result containing the created action, intents, transactions, and ICRC-112 requests
    /// # Errors
    /// * `CanisterError` - If there is an error during transaction creation
    fn create_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: Option<HashMap<String, Vec<Transaction>>>,
    ) -> Result<CreateActionResult, CanisterError>;

    /// Process the given action by executing the associated transactions
    /// # Arguments
    /// * `action` - The action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their corresponding transactions
    /// # Returns
    /// * `ProcessActionResult` - The result containing the processed action, intents, and transactions
    /// # Errors
    /// * `CanisterError` - If there is an error during action processing
    fn process_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResult, CanisterError>>>>;
}
