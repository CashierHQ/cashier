// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v3::action_result::{
        CreateActionResult as CreateActionResultV3, ProcessActionResult as ProcessActionResultV3,
    },
    repository::{action::v3::ActionV3, intent::v3::IntentV3, transaction::v1::Transaction},
};
use std::collections::HashMap;

use crate::transaction::traits::{ExecutionService, ValidationService};

pub trait TransactionManagerV3 {
    fn create_action(
        &self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: Option<HashMap<String, Vec<Transaction>>>,
    ) -> Result<CreateActionResultV3, CanisterError>;

    async fn process_action<V, X>(
        &self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        validation_service: V,
        execution_service: X,
    ) -> Result<ProcessActionResultV3, CanisterError>
    where
        V: ValidationService,
        X: ExecutionService;
}
