use cashier_backend_types::{error::CanisterError, repository::transaction::v1::Transaction};
use std::pin::Pin;

pub trait TransactionValidator {
    fn validate(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), CanisterError>>>>;
}
