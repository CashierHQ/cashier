use std::rc::Rc;

use cashier_backend_types::{
    error::CanisterError,
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

    pub async fn execute_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<Vec<Transaction>, CanisterError> {
        let mut executed_transactions = Vec::<Transaction>::new();
        for transaction in transactions.iter() {
            match self.executor.execute(transaction.clone()).await {
                Ok(_executed_tx) => {
                    let executed_tx = Transaction {
                        state: TransactionState::Success,
                        ..transaction.clone()
                    };
                    executed_transactions.push(executed_tx);
                }
                Err(_err) => {
                    let failed_tx = Transaction {
                        state: TransactionState::Fail,
                        ..transaction.clone()
                    };
                    executed_transactions.push(failed_tx);
                }
            }
        }
        Ok(executed_transactions)
    }
}
