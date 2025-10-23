use crate::repository::transaction::v1::Transaction;

pub struct ValidateActionTransactionsResult {
    pub transactions: Vec<Transaction>,
    pub is_dependencies_resolved: bool,
}
