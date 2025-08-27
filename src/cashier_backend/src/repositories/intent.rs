// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::intent::v2::Intent;
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};

pub type IntentRepositoryStorage = StableBTreeMap<String, Intent, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct IntentRepository<S: Storage<IntentRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<IntentRepositoryStorage>> IntentRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn batch_create(&mut self, intents: Vec<Intent>) {
        self.storage.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn batch_update(&mut self, intents: Vec<Intent>) {
        self.storage.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn get(&self, id: &str) -> Option<Intent> {
        self.storage.with_borrow(|store| store.get(&id.to_string()))
    }

    pub fn batch_get(&self, ids: Vec<String>) -> Vec<Intent> {
        self.storage
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::random_id_string,
    };
    use candid::Nat;
    use cashier_backend_types::repository::{
        common::{Asset, Chain, Wallet},
        intent::v2::{IntentState, IntentTask, IntentType, TransferData},
    };
    use cashier_common::test_utils::random_principal_id;
    use std::str::FromStr;

    #[test]
    fn it_should_batch_create_intents() {
        // Arrange
        let mut repo = TestRepositories::new().intent();
        let intent_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let intent1 = Intent {
            id: intent_id1.clone(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("0").unwrap(),
            }),
            label: "Test Intent".to_string(),
        };
        let intent2 = Intent {
            id: intent_id2.clone(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("100").unwrap(),
            }),
            label: "Another Test Intent".to_string(),
        };

        // Act
        repo.batch_create(vec![intent1, intent2]);

        // Assert
        let retrieved_intent = repo.get(&intent_id1);
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().id, intent_id1);

        let retrieved_intent = repo.get(&intent_id2);
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().id, intent_id2);
    }

    #[test]
    fn it_should_batch_update_intents() {
        // Arrange
        let mut repo = TestRepositories::new().intent();
        let intent_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let intent1 = Intent {
            id: intent_id1.clone(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("0").unwrap(),
            }),
            label: "Test Intent".to_string(),
        };

        let intent2 = Intent {
            id: intent_id2.clone(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("100").unwrap(),
            }),
            label: "Updated Test Intent".to_string(),
        };
        repo.batch_create(vec![intent1, intent2]);

        let updated_intent1 = Intent {
            id: intent_id1.clone(),
            state: IntentState::Success,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("100").unwrap(),
            }),
            label: "Updated Intent".to_string(),
        };
        let update_intent2 = Intent {
            id: intent_id2.clone(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("200").unwrap(),
            }),
            label: "Updated Another Test Intent".to_string(),
        };

        // Act
        repo.batch_update(vec![updated_intent1, update_intent2]);

        // Assert
        let retrieved_intent = repo.get(&intent_id1);
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().state, IntentState::Success);

        let retrieved_intent = repo.get(&intent_id2);
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().state, IntentState::Success);
    }

    #[test]
    fn it_should_get_an_intent() {
        // Arrange
        let mut repo = TestRepositories::new().intent();
        let intent_id = random_id_string();
        let intent = Intent {
            id: intent_id.clone(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("0").unwrap(),
            }),
            label: "Test Intent".to_string(),
        };
        repo.batch_create(vec![intent]);

        // Act
        let retrieved_intent = repo.get(&intent_id);

        // Assert
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().id, intent_id);
    }

    #[test]
    fn it_should_batch_get_intents() {
        // Arrange
        let mut repo = TestRepositories::new().intent();
        let intent_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let intent1 = Intent {
            id: intent_id1.clone(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("0").unwrap(),
            }),
            label: "Test Intent".to_string(),
        };
        let intent2 = Intent {
            id: intent_id2.clone(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC { address: random_principal_id() },
                amount: Nat::from_str("100").unwrap(),
            }),
            label: "Another Test Intent".to_string(),
        };
        repo.batch_create(vec![intent1, intent2]);

        // Act
        let retrieved_intents = repo.batch_get(vec![intent_id1.clone(), intent_id2.clone()]);

        // Assert
        assert_eq!(retrieved_intents.len(), 2);
        assert_eq!(retrieved_intents.first().unwrap().id, intent_id1);
        assert_eq!(retrieved_intents.get(1).unwrap().id, intent_id2);
    }
}
