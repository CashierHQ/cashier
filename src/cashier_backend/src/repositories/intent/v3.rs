// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::intent::v3::{IntentCodecV3, IntentV3};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type IntentV3RepositoryStorage =
    VersionedBTreeMap<String, IntentV3, IntentCodecV3, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct IntentV3Repository<S: Storage<IntentV3RepositoryStorage>> {
    storage: S,
}

impl<S: Storage<IntentV3RepositoryStorage>> IntentV3Repository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn batch_create(&mut self, intents: Vec<IntentV3>) {
        self.storage.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn batch_update(&mut self, intents: Vec<IntentV3>) {
        self.storage.with_borrow_mut(|store| {
            for intent in intents {
                let id = intent.id.clone();
                store.insert(id, intent);
            }
        });
    }

    pub fn get(&self, id: &str) -> Option<IntentV3> {
        self.storage.with_borrow(|store| store.get(&id.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use crate::repositories::{Repositories, tests::TestRepositories};
    use candid::{Nat, Principal};
    use cashier_backend_types::repository::{
        asset::v3::AssetV3,
        common::AddressTypeV3,
        intent::{
            v1::IntentState,
            v3::{IntentTypeV3, IntentV3},
        },
    };
    use cashier_common::test_utils::random_id_string;

    fn fixture_of_intent_v3(id: &str, state: IntentState, amount: u64) -> IntentV3 {
        IntentV3 {
            id: id.to_string(),
            label: "Test Intent V3".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3::default(),
            amount: Nat::from(amount),
            total_amount: Some(Nat::from(amount)),
            network_fee: None,
            user_fee: None,
            source_address: Principal::anonymous(),
            source_account: None,
            source_address_type: AddressTypeV3::Creator,
            dest_address: Principal::anonymous(),
            dest_account: None,
            dest_address_type: AddressTypeV3::Link,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: "action_v3_id".to_string(),
            state,
            created_at: 1_622_547_800,
        }
    }

    #[test]
    fn it_should_fail_get_intent_v3_due_to_intent_not_found() {
        // Arrange
        let repo = TestRepositories::new().intent_v3();
        let intent_id = random_id_string();

        // Act
        let result = repo.get(&intent_id);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_succeed_batch_create_intents_v3() {
        // Arrange
        let mut repo = TestRepositories::new().intent_v3();
        let intent_id_1 = random_id_string();
        let intent_id_2 = random_id_string();
        let intent_1 = fixture_of_intent_v3(&intent_id_1, IntentState::Created, 100);
        let intent_2 = fixture_of_intent_v3(&intent_id_2, IntentState::Processing, 200);

        // Act
        repo.batch_create(vec![intent_1, intent_2]);

        // Assert
        let result_1 = repo.get(&intent_id_1);
        assert!(result_1.is_some());
        assert_eq!(result_1.unwrap().id, intent_id_1);

        let result_2 = repo.get(&intent_id_2);
        assert!(result_2.is_some());
        assert_eq!(result_2.unwrap().id, intent_id_2);
    }

    #[test]
    fn it_should_succeed_batch_update_intents_v3() {
        // Arrange
        let mut repo = TestRepositories::new().intent_v3();
        let intent_id_1 = random_id_string();
        let intent_id_2 = random_id_string();
        let intent_1 = fixture_of_intent_v3(&intent_id_1, IntentState::Created, 100);
        let intent_2 = fixture_of_intent_v3(&intent_id_2, IntentState::Created, 200);
        repo.batch_create(vec![intent_1, intent_2]);

        let updated_intent_1 = fixture_of_intent_v3(&intent_id_1, IntentState::Success, 300);
        let updated_intent_2 = fixture_of_intent_v3(&intent_id_2, IntentState::Fail, 400);

        // Act
        repo.batch_update(vec![updated_intent_1, updated_intent_2]);

        // Assert
        let result_1 = repo.get(&intent_id_1);
        assert!(result_1.is_some());
        let result_1 = result_1.unwrap();
        assert_eq!(result_1.state, IntentState::Success);
        assert_eq!(result_1.amount, Nat::from(300u64));

        let result_2 = repo.get(&intent_id_2);
        assert!(result_2.is_some());
        let result_2 = result_2.unwrap();
        assert_eq!(result_2.state, IntentState::Fail);
        assert_eq!(result_2.amount, Nat::from(400u64));
    }

    #[test]
    fn it_should_succeed_get_intent_v3() {
        // Arrange
        let mut repo = TestRepositories::new().intent_v3();
        let intent_id = random_id_string();
        let intent = fixture_of_intent_v3(&intent_id, IntentState::Created, 100);
        repo.batch_create(vec![intent]);

        // Act
        let result = repo.get(&intent_id);

        // Assert
        assert!(result.is_some());
        assert_eq!(result.unwrap().id, intent_id);
    }
}
