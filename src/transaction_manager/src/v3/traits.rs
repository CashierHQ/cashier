// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v3::action_result::{
        CreateActionResult as CreateActionResultV3, ProcessActionResult as ProcessActionResultV3,
    },
    repository::{action::v3::ActionV3, intent::v3::IntentV3, transaction::v1::Transaction},
};
use std::{collections::HashMap, future::Future, pin::Pin};

use crate::transaction::traits::{ExecutionService, ValidationService};

pub trait TransactionManagerV3 {
    /// Create an action with the given action details, intents, and intent-transaction mapping
    /// # Arguments
    /// * `action` - The details of the action to be created
    /// * `intents` - A list of intents associated with the action
    /// * `intent_txs_map` - An optional mapping of intent IDs to their corresponding transactions
    /// # Returns
    /// * `Ok(CreateActionResultV3)` if the action is successfully created
    /// * `Err(CanisterError)` if errors
    fn create_action(
        &self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: Option<HashMap<String, Vec<Transaction>>>,
    ) -> Result<CreateActionResultV3, CanisterError>;

    /// Process an action by validating and executing its associated transactions, and rollup the action state
    /// # Arguments
    /// * `action` - The details of the action to be processed
    /// * `intents` - A list of intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their corresponding transactions
    /// * `validation_service` - An implementation of the ValidationService trait for validating transactions
    /// * `execution_service` - An implementation of the ExecutionService trait for executing transactions
    /// # Returns
    /// * `Ok(ProcessActionResultV3)` if the action is successfully processed
    /// * `Err(CanisterError)` if errors occur during validation, execution, or state rollup
    fn process_action<'a, V, X>(
        &'a self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        validation_service: V,
        execution_service: X,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResultV3, CanisterError>> + 'a>>
    where
        V: ValidationService + 'a,
        X: ExecutionService + 'a;
}
