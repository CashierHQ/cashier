use std::rc::Rc;

use cashier_backend_types::{
    error::CanisterError,
    link_v2::transaction_manager::ExecuteTransactionsResult,
    repository::transaction::v1::{Transaction, TransactionState},
};

use crate::link_v2::transaction::traits::TransactionExecutor;

pub struct ExecutorService<E: TransactionExecutor> {
    executor: Rc<E>,
}

impl<E: TransactionExecutor> ExecutorService<E> {
    pub fn new(executor: Rc<E>) -> Self {
        Self { executor }
    }

    /// Executes a list of transactions using the underlying executor.
    /// # Arguments
    /// * `transactions` - A slice of transactions to be executed
    /// # Returns
    /// * `Result<ExecuteTransactionsResult, CanisterError>` - The result of executing the transactions
    pub async fn execute_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<ExecuteTransactionsResult, CanisterError> {
        let mut executed_transactions = Vec::<Transaction>::new();
        let mut errors = Vec::<String>::new();
        let mut is_success = true;
        for transaction in transactions.iter() {
            match self.executor.execute(transaction.clone()).await {
                Ok(_executed_tx) => {
                    let executed_tx = Transaction {
                        state: TransactionState::Success,
                        ..transaction.clone()
                    };
                    executed_transactions.push(executed_tx);
                }
                Err(err) => {
                    let failed_tx = Transaction {
                        state: TransactionState::Fail,
                        ..transaction.clone()
                    };
                    executed_transactions.push(failed_tx);
                    errors.push(format!(
                        "Transaction {} failed to execute: {}",
                        transaction.id, err
                    ));
                    is_success = false;
                }
            }
        }
        Ok(ExecuteTransactionsResult {
            transactions: executed_transactions,
            is_success,
            errors,
        })
    }
}
