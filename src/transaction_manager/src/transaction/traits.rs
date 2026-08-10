// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v3::transaction_manager::RollupActionStateResultV3,
    repository::{action::v3::ActionV3, intent::v3::IntentV3, transaction::v1::Transaction},
    transaction_manager::{ExecuteTransactionsResult, ValidateActionTransactionsResult},
};
use std::{collections::HashMap, future::Future, pin::Pin};

pub trait TransactionValidator {
    /// Validate the transaction success
    /// # Arguments
    /// * `transaction` - The transaction to be validated
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<(), CanisterError>>>` - A future that resolves to Ok(()) if the transaction is succeeded, or a CanisterError if error occurs
    fn validate_success(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), String>>>>;
}

pub trait TransactionExecutor {
    /// Execute the transaction
    /// # Arguments
    /// * `transaction` - The transaction to be executed
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok(()) if processing is successful, or a CanisterError if error occurs
    fn execute(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), CanisterError>>>>;
}

pub trait ValidationService {
    /// Validate the transaction
    /// # Arguments
    /// * `transactions` - The transactions to be validated
    /// # Returns
    /// * `Result<ValidateActionTransactionsResult, CanisterError>` - Ok(ValidateActionTransactionsResult) if validation is successful, or a CanisterError if error occurs
    fn validate_action_transactions<'a>(
        &'a self,
        transactions: &'a [Transaction],
    ) -> Pin<Box<dyn Future<Output = Result<ValidateActionTransactionsResult, CanisterError>> + 'a>>;

    /// Rollup the transaction state for the ICRC-2 wallet transactions
    /// # Arguments
    /// * `transactions` - The transactions to be rolled up
    /// # Returns
    /// * `()` - No return value, the function updates the transaction states in place
    fn rollup_icrc2_wallet_transaction_state(&self, transactions: &mut [Transaction]);

    /// Rollup the action state based on the transaction states and dependencies for V3 action
    /// # Arguments
    /// * `action` - The V3 action for which the state needs to be rolled up
    /// * `intents` - The V3 intents associated with the action
    /// * `intent_txs_map` - A map of intent IDs to their associated transactions
    /// # Returns
    /// * `Ok(RollupActionStateResultV3)` - The rolled up action state result if successful
    /// * `Err(CanisterError)` - If error occurs during rollup
    fn rollup_action_state_v3(
        &self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<RollupActionStateResultV3, CanisterError>;
}

pub trait ExecutionService {
    /// Execute the transactions
    /// # Arguments
    /// * `transactions` - The transactions to be executed
    /// # Returns
    /// * `Result<ExecuteTransactionsResult, CanisterError>` - Ok(ExecuteTransactionsResult) if processing is successful, or a CanisterError if error occurs
    fn execute_transactions<'a>(
        &'a self,
        transactions: &'a [Transaction],
    ) -> Pin<Box<dyn Future<Output = Result<ExecuteTransactionsResult, CanisterError>> + 'a>>;
}
