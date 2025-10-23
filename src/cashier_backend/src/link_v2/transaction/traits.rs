use cashier_backend_types::{error::CanisterError, repository::transaction::v1::Transaction};
use std::pin::Pin;

pub trait TransactionValidator {
    /// Validate the transaction success
    /// # Arguments
    /// * `transaction` - The transaction to be validated
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<(), CanisterError>>>` - A future that resolves to Ok(()) if the transaction is succeeded, or a CanisterError if error occurs
    fn validate_success(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), CanisterError>>>>;
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
