use cashier_types::processing_transaction::ProcessingTransaction;

use crate::repositories::PROCESSING_TRANSACTION_STORE;

pub struct ProcessingTransactionRepository {}

impl Default for ProcessingTransactionRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl ProcessingTransactionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, transaction_id: String, processing_tx: ProcessingTransaction) {
        PROCESSING_TRANSACTION_STORE.with_borrow_mut(|store| {
            store.insert(transaction_id, processing_tx);
        });
    }

    pub fn get(&self, transaction_id: &str) -> Option<ProcessingTransaction> {
        PROCESSING_TRANSACTION_STORE.with_borrow(|store| store.get(&transaction_id.to_string()))
    }

    pub fn exists(&self, transaction_id: &str) -> bool {
        PROCESSING_TRANSACTION_STORE
            .with_borrow(|store| store.contains_key(&transaction_id.to_string()))
    }

    pub fn delete(&self, transaction_id: &str) {
        PROCESSING_TRANSACTION_STORE.with_borrow_mut(|store| {
            store.remove(&transaction_id.to_string());
        });
    }

    pub fn get_all(&self) -> Vec<ProcessingTransaction> {
        PROCESSING_TRANSACTION_STORE.with_borrow(|store| store.values().collect())
    }
}
