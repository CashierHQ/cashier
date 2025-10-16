use cashier_backend_types::repository::processing_transaction::{ProcessingTransaction, ProcessingTransactionCodec};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapIteratorStructure, BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type ProcessingTransactionRepositoryStorage =
    VersionedBTreeMap<String, ProcessingTransaction, ProcessingTransactionCodec, VirtualMemory<DefaultMemoryImpl>>;

pub struct ProcessingTransactionRepository<S: Storage<ProcessingTransactionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<ProcessingTransactionRepositoryStorage>> ProcessingTransactionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, transaction_id: String, processing_tx: ProcessingTransaction) {
        self.storage.with_borrow_mut(|store| {
            store.insert(transaction_id, processing_tx);
        });
    }

    pub fn exists(&self, transaction_id: &str) -> bool {
        self.storage
            .with_borrow(|store| store.contains_key(&transaction_id.to_string()))
    }

    pub fn delete(&mut self, transaction_id: &str) {
        self.storage.with_borrow_mut(|store| {
            store.remove(&transaction_id.to_string());
        });
    }

    pub fn get_all(&self) -> Vec<ProcessingTransaction> {
        self.storage.with_borrow(|store| store.iter().map(|(_, v)| v).collect::<Vec<_>>())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::random_id_string,
    };

    #[test]
    fn it_should_create_a_processing_transaction() {
        // Arrange
        let mut repo = TestRepositories::new().processing_transaction();
        let transaction_id = random_id_string();
        let processing_tx = ProcessingTransaction {
            transaction_id: transaction_id.clone(),
            start_time: 1622547800,
            timeout_at: 1622547900,
        };

        // Act
        repo.create(transaction_id.clone(), processing_tx);

        // Assert
        assert!(repo.exists(&transaction_id));
    }

    #[test]
    fn it_should_delete_a_processing_transaction() {
        // Arrange
        let mut repo = TestRepositories::new().processing_transaction();
        let transaction_id = random_id_string();
        let processing_tx = ProcessingTransaction {
            transaction_id: transaction_id.clone(),
            start_time: 1622547800,
            timeout_at: 1622547900,
        };

        repo.create(transaction_id.clone(), processing_tx);
        assert!(repo.exists(&transaction_id));

        // Act
        repo.delete(&transaction_id);

        // Assert
        assert!(!repo.exists(&transaction_id));
    }

    #[test]
    fn it_should_check_if_a_processing_transaction_exists() {
        // Arrange
        let mut repo = TestRepositories::new().processing_transaction();
        let transaction_id = random_id_string();
        let processing_tx = ProcessingTransaction {
            transaction_id: transaction_id.clone(),
            start_time: 1622547800,
            timeout_at: 1622547900,
        };

        repo.create(transaction_id.clone(), processing_tx);

        // Act
        let result = repo.exists(&transaction_id);

        // Assert
        assert!(result);
    }

    #[test]
    fn it_should_get_all_processing_transactions() {
        // Arrange
        let mut repo = TestRepositories::new().processing_transaction();
        let transaction_id1 = random_id_string();
        let transaction_id2 = random_id_string();

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

        // Act
        let all_transactions = repo.get_all();

        // Assert
        assert_eq!(all_transactions.len(), 2);
    }
}
