// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::TRANSACTION_STORE;

use cashier_types::repository::{keys::TransactionKey, transaction::v2::Transaction};

#[derive(Clone)]
pub struct TransactionRepository {}

impl Default for TransactionRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl TransactionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn update(&self, transaction: Transaction) -> Transaction {
        let id: TransactionKey = transaction.id.clone();
        TRANSACTION_STORE.with_borrow_mut(|store| {
            store.insert(id, transaction.clone());
        });

        transaction
    }

    pub fn batch_create(&self, transactions: Vec<Transaction>) {
        TRANSACTION_STORE.with_borrow_mut(|store| {
            for transaction in transactions {
                let id: TransactionKey = transaction.id.clone();
                store.insert(id, transaction);
            }
        });
    }

    pub fn batch_get(&self, ids: Vec<TransactionKey>) -> Vec<Transaction> {
        TRANSACTION_STORE
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn get(&self, id: &TransactionKey) -> Option<Transaction> {
        TRANSACTION_STORE.with_borrow(|store| store.get(id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;
    use cashier_types::repository::{transaction::v2::{Transaction, TransactionState, FromCallType, Protocol, IcTransaction, Icrc1Transfer}, common::{Asset, Chain, Wallet}};
    use candid::types::number::Nat;

    #[test]
    fn batch_create() {
        let repo = TransactionRepository::new();
        let transaction1 = Transaction {
            id: "transaction1".to_string(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap(), memo: None, ts: Some(1622547800) })),
            start_ts: None,
        };
        let transaction2 = Transaction {
            id: "transaction2".to_string(),
            created_at: 1622547900,
            state: TransactionState::Processing,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("200").unwrap(), memo: None, ts: Some(1622547900) })),
            start_ts: None,
        };
        repo.batch_create(vec![transaction1.clone(), transaction2.clone()]);

        let transactions = repo.batch_get(vec![
            "transaction1".to_string(),
            "transaction2".to_string(),
        ]);
        assert_eq!(transactions.len(), 2);
        assert_eq!(transactions[0], transaction1);
        assert_eq!(transactions[1], transaction2);
    }

    #[test]
    fn update() {
        let repo = TransactionRepository::new();
        let transaction1 = Transaction {
            id: "transaction1".to_string(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap(), memo: None, ts: Some(1622547800) })),
            start_ts: None,
        };
        repo.batch_create(vec![transaction1.clone()]);

        let mut transaction1_updated = transaction1.clone();
        transaction1_updated.state = TransactionState::Processing;
        repo.update(transaction1_updated.clone());
        assert_eq!(repo.get(&transaction1_updated.id), Some(transaction1_updated));
    }

    #[test]
    fn batch_get() {
        let repo = TransactionRepository::new();
        let transaction1 = Transaction {
            id: "transaction1".to_string(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap(), memo: None, ts: Some(1622547800) })),
            start_ts: None,
        };
        let transaction2 = Transaction {
            id: "transaction2".to_string(),
            created_at: 1622547900,
            state: TransactionState::Processing,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("200").unwrap(), memo: None, ts: Some(1622547900) })),
            start_ts: None,
        };
        repo.batch_create(vec![transaction1.clone(), transaction2.clone()]);

        let transactions = repo.batch_get(vec![
            "transaction1".to_string(),
            "transaction2".to_string(),
        ]);
        assert_eq!(transactions.len(), 2);
        assert_eq!(transactions[0], transaction1);
        assert_eq!(transactions[1], transaction2);
    }

    #[test]
    fn get() {
        let repo = TransactionRepository::new();
        let transaction = Transaction {
            id: "transaction1".to_string(),
            created_at: 1622547800,
            state: TransactionState::Created,
            dependency: None,
            group: 1u16,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap(), memo: None, ts: Some(1622547800) })),
            start_ts: None,
        };
        repo.batch_create(vec![transaction.clone()]);

        let retrieved_transaction = repo.get(&transaction.id);
        assert!(retrieved_transaction.is_some());
        assert_eq!(retrieved_transaction.unwrap().id, "transaction1");
    }

    #[test]
    fn default() {
        let repo = TransactionRepository::default();
        assert!(repo.batch_get(vec!["nonexistent".to_string()]).is_empty());
    }
}
