// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{
    keys::TransactionKey,
    transaction::v1::{Transaction, TransactionCodec},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type TransactionRepositoryStorage = VersionedBTreeMap<
    TransactionKey,
    Transaction,
    TransactionCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;

#[derive(Clone)]
pub struct TransactionRepository<S: Storage<TransactionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<TransactionRepositoryStorage>> TransactionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn update(&mut self, transaction: Transaction) -> Transaction {
        let id: TransactionKey = transaction.id.clone();
        self.storage.with_borrow_mut(|store| {
            store.insert(id, transaction.clone());
        });

        transaction
    }

    pub fn batch_create(&mut self, transactions: Vec<Transaction>) {
        self.storage.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                store.insert(id, transaction);
            }
        });
    }

    pub fn batch_get(&self, ids: Vec<TransactionKey>) -> Vec<Transaction> {
        self.storage
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn get(&self, id: &TransactionKey) -> Option<Transaction> {
        self.storage.with_borrow(|store| store.get(id))
    }
}

#[cfg(test)]
mod tests {

    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::{random_id_string, random_principal_id},
    };
    use candid::Nat;
    use cashier_backend_types::repository::{
        common::{Asset, Wallet},
        transaction::v1::{
            FromCallType, IcTransaction, Icrc1Transfer, Protocol, Transaction, TransactionState,
        },
    };
    use std::str::FromStr;

    #[test]
    fn it_should_batch_create_transactions() {
        // Arrange
        let mut repo = TestRepositories::new().transaction();
        let transaction_id1 = random_id_string();
        let transaction_id2 = random_id_string();
        let transaction1 = Transaction {
            id: transaction_id1.clone(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from_str("100").unwrap(),
                memo: None,
                ts: Some(1622547800),
            })),
            start_ts: None,
        };
        let transaction2 = Transaction {
            id: transaction_id2.clone(),
            created_at: 1622547900,
            state: TransactionState::Processing,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from_str("200").unwrap(),
                memo: None,
                ts: Some(1622547900),
            })),
            start_ts: None,
        };

        // Act
        repo.batch_create(vec![transaction1.clone(), transaction2.clone()]);

        // Assert
        let transactions = repo.batch_get(vec![transaction_id1, transaction_id2]);
        assert_eq!(transactions.len(), 2);
        assert_eq!(transactions.first().unwrap(), &transaction1);
        assert_eq!(transactions.get(1).unwrap(), &transaction2);
    }

    #[test]
    fn it_should_update_a_transaction() {
        // Arrange
        let mut repo = TestRepositories::new().transaction();
        let transaction_id1 = random_id_string();
        let transaction1 = Transaction {
            id: transaction_id1,
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from_str("100").unwrap(),
                memo: None,
                ts: Some(1622547800),
            })),
            start_ts: None,
        };
        repo.batch_create(vec![transaction1.clone()]);

        let mut transaction1_updated = transaction1;
        transaction1_updated.state = TransactionState::Processing;

        // Act
        repo.update(transaction1_updated.clone());

        // Assert
        assert_eq!(
            repo.get(&transaction1_updated.id),
            Some(transaction1_updated)
        );
    }

    #[test]
    fn it_should_batch_get_transactions() {
        // Arrange
        let mut repo = TestRepositories::new().transaction();
        let transaction_id1 = random_id_string();
        let transaction_id2 = random_id_string();
        let transaction1 = Transaction {
            id: transaction_id1.clone(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from_str("100").unwrap(),
                memo: None,
                ts: Some(1622547800),
            })),
            start_ts: None,
        };
        let transaction2 = Transaction {
            id: transaction_id2.clone(),
            created_at: 1622547900,
            state: TransactionState::Processing,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from_str("200").unwrap(),
                memo: None,
                ts: Some(1622547900),
            })),
            start_ts: None,
        };
        repo.batch_create(vec![transaction1.clone(), transaction2.clone()]);

        // Act
        let transactions = repo.batch_get(vec![transaction_id1, transaction_id2]);

        // Assert
        assert_eq!(transactions.len(), 2);
        assert_eq!(transactions.first().unwrap(), &transaction1);
        assert_eq!(transactions.get(1).unwrap(), &transaction2);
    }

    #[test]
    fn it_should_get_a_transaction() {
        // Arrange
        let mut repo = TestRepositories::new().transaction();
        let transaction_id = random_id_string();
        let transaction = Transaction {
            id: transaction_id.clone(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from_str("100").unwrap(),
                memo: None,
                ts: Some(1622547800),
            })),
            start_ts: None,
        };
        repo.batch_create(vec![transaction.clone()]);

        // Act
        let retrieved_transaction = repo.get(&transaction.id);

        // Assert
        assert!(retrieved_transaction.is_some());
        assert_eq!(retrieved_transaction.unwrap().id, transaction_id);
    }
}
