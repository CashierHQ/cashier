use cashier_backend_types::repository::processing_transaction::ProcessingTransaction;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::random_id_string;

    #[test]
    fn it_should_create_a_processing_transaction() {
        let repo = ProcessingTransactionRepository::new();
        let transaction_id = random_id_string(10);
        let processing_tx = ProcessingTransaction {
            transaction_id: transaction_id.clone(),
            start_time: 1622547800,
            timeout_at: 1622547900,
        };

        repo.create(transaction_id.clone(), processing_tx);
        assert!(repo.exists(&transaction_id));
    }

    #[test]
    fn it_should_delete_a_processing_transaction() {
        let repo = ProcessingTransactionRepository::new();
        let transaction_id = random_id_string(10);
        let processing_tx = ProcessingTransaction {
            transaction_id: transaction_id.clone(),
            start_time: 1622547800,
            timeout_at: 1622547900,
        };

        repo.create(transaction_id.clone(), processing_tx);
        assert!(repo.exists(&transaction_id));

        repo.delete(&transaction_id);
        assert!(!repo.exists(&transaction_id));
    }

    #[test]
    fn it_should_check_if_a_processing_transaction_exists() {
        let repo = ProcessingTransactionRepository::new();
        let transaction_id = random_id_string(10);
        let processing_tx = ProcessingTransaction {
            transaction_id: transaction_id.clone(),
            start_time: 1622547800,
            timeout_at: 1622547900,
        };

        repo.create(transaction_id.clone(), processing_tx);
        assert!(repo.exists(&transaction_id));

        repo.delete(&transaction_id);
        assert!(!repo.exists(&transaction_id));
    }

    #[test]
    fn it_should_get_all_processing_transactions() {
        let repo = ProcessingTransactionRepository::new();
        let transaction_id1 = random_id_string(10);
        let transaction_id2 = random_id_string(10);

        let processing_tx1 = ProcessingTransaction {
            transaction_id: transaction_id1.clone(),
            start_time: 1622547800,
            timeout_at: 1622547900,
        };
        let processing_tx2 = ProcessingTransaction {
            transaction_id: transaction_id2.clone(),
            start_time: 1622547801,
            timeout_at: 1622547901,
        };

        repo.create(transaction_id1, processing_tx1);
        repo.create(transaction_id2, processing_tx2);

        let all_transactions = repo.get_all();
        assert_eq!(all_transactions.len(), 2);
    }

    #[test]
    fn it_should_create_a_processing_transaction_repository_by_default() {
        let repo = ProcessingTransactionRepository::default();
        assert!(repo.get_all().is_empty());
    }
}
