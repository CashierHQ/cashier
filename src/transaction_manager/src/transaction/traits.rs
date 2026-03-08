// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v2::transaction_manager::{
        ExecuteTransactionsResult, RollupActionStateResult, ValidateActionTransactionsResult,
    },
    link_v3::transaction_manager::RollupActionStateResultV3,
    repository::{
        action::{v1::Action, v3::ActionV3},
        intent::{v1::Intent, v3::IntentV3},
        transaction::v1::Transaction,
    },
};
use std::{collections::HashMap, pin::Pin};

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
    async fn validate_action_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<ValidateActionTransactionsResult, CanisterError>;

    fn rollup_icrc2_wallet_transaction_state(&self, transactions: &mut [Transaction]);

    fn rollup_action_state(
        &self,
        action: Action,
        intents: &[Intent],
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<RollupActionStateResult, CanisterError>;

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
    async fn execute_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<ExecuteTransactionsResult, CanisterError>;
}
