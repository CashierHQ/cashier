// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::intent::v2::Intent;

use crate::repositories::INTENT_STORE;

#[derive(Clone)]

pub struct IntentRepository {}

impl Default for IntentRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl IntentRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn batch_create(&self, intents: Vec<Intent>) {
        INTENT_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn batch_update(&self, intents: Vec<Intent>) {
        INTENT_STORE.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn get(&self, id: &str) -> Option<Intent> {
        INTENT_STORE.with_borrow(|store| store.get(&id.to_string()))
    }

    pub fn batch_get(&self, ids: Vec<String>) -> Vec<Intent> {
        INTENT_STORE.with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;
    use cashier_types::repository::{common::{Asset, Chain, Wallet}, intent::{v2::{IntentState, IntentTask, IntentType, TransferData}}};
    use candid::types::number::Nat;

    #[test]
    fn batch_create() {
        let repo = IntentRepository::new();
        let intent1 = Intent {
            id: "intent1".to_string(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("0").unwrap() }),
            label: "Test Intent".to_string(),
        };
        let intent2 = Intent {
            id: "intent2".to_string(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap() }),
            label: "Another Test Intent".to_string(),
        };

        repo.batch_create(vec![intent1, intent2]);

        let retrieved_intent = repo.get("intent1");
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().id, "intent1");

        let retrieved_intent = repo.get("intent2");
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().id, "intent2");
    }

    #[test]
    fn batch_update() {
        let repo = IntentRepository::new();
        let intent1 = Intent {
            id: "intent1".to_string(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("0").unwrap() }),
            label: "Test Intent".to_string(),
        };

        let intent2 = Intent {
            id: "intent2".to_string(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap() }),
            label: "Updated Test Intent".to_string(),
        };
        repo.batch_create(vec![intent1, intent2]);

        let updated_intent1 = Intent {
            id: "intent1".to_string(),
            state: IntentState::Success,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap() }),
            label: "Updated Intent".to_string(),
        };
        let update_intent2 = Intent {
            id: "intent2".to_string(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("200").unwrap() }),
            label: "Updated Another Test Intent".to_string(),
        };
        repo.batch_update(vec![updated_intent1, update_intent2]);

        let retrieved_intent = repo.get("intent1");
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().state, IntentState::Success);

        let retrieved_intent = repo.get("intent2");
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().state, IntentState::Success);
    }

    #[test]
    fn get() {
        let repo = IntentRepository::new();
        let intent = Intent {
            id: "intent1".to_string(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("0").unwrap() }),
            label: "Test Intent".to_string(),
        };
        repo.batch_create(vec![intent.clone()]);

        let retrieved_intent = repo.get("intent1");
        assert!(retrieved_intent.is_some());
        assert_eq!(retrieved_intent.unwrap().id, "intent1");
    }

    #[test]
    fn batch_get() {
        let repo = IntentRepository::new();
        let intent1 = Intent {
            id: "intent1".to_string(),
            state: IntentState::Processing,
            created_at: 1622547800,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("0").unwrap() }),
            label: "Test Intent".to_string(),
        };
        let intent2 = Intent {
            id: "intent2".to_string(),
            state: IntentState::Success,
            created_at: 1622547801,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData { from: Wallet::default(), to: Wallet::default(), asset: Asset::default(), amount: Nat::from_str("100").unwrap() }),
            label: "Another Test Intent".to_string(),
        };
        repo.batch_create(vec![intent1, intent2]);

        let retrieved_intents = repo.batch_get(vec!["intent1".to_string(), "intent2".to_string()]);
        assert_eq!(retrieved_intents.len(), 2);
        assert_eq!(retrieved_intents[0].id, "intent1");
        assert_eq!(retrieved_intents[1].id, "intent2");
    }

    #[test]
    fn default() {
        let repo = IntentRepository::default();
        let intent = repo.get("nonexistent");
        assert!(intent.is_none());

        let intents = repo.batch_get(vec!["nonexistent".to_string()]);
        assert!(intents.is_empty());
    }

}
