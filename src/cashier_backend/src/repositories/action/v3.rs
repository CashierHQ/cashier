// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{
    action::v3::{ActionCodecV3, ActionV3},
    keys::ActionKey,
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type ActionV3RepositoryStorage =
    VersionedBTreeMap<ActionKey, ActionV3, ActionCodecV3, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct ActionV3Repository<S: Storage<ActionV3RepositoryStorage>> {
    storage: S,
}

impl<S: Storage<ActionV3RepositoryStorage>> ActionV3Repository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, action: ActionV3) {
        self.storage.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }

    pub fn get(&self, action_id: &str) -> Option<ActionV3> {
        self.storage
            .with_borrow(|store| store.get(&action_id.to_string()))
    }

    pub fn update(&mut self, action: ActionV3) {
        self.storage.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }
}

#[cfg(test)]
mod tests {
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_backend_types::repository::action::{
        v1::{ActionState, ActionType},
        v3::ActionV3,
    };
    use cashier_backend_types::repository::common::AddressTypeV3;
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_of_action_v3(id: &str, state: ActionState, link_id: &str) -> ActionV3 {
        ActionV3 {
            id: id.to_string(),
            action_type: ActionType::CreateLink,
            state,
            creator: random_principal_id(),
            creator_address_type: AddressTypeV3::Creator,
            link_id: link_id.to_string(),
            intent_ids: vec!["intent_1".to_string(), "intent_2".to_string()],
        }
    }

    #[test]
    fn it_should_fail_get_action_v3_due_to_action_not_found() {
        // Arrange
        let repo = TestRepositories::new().action_v3();

        // Act
        let result = repo.get("non_existent_action_v3");

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_succeed_create_action_v3() {
        // Arrange
        let mut repo = TestRepositories::new().action_v3();
        let action_id = random_id_string();
        let action = fixture_of_action_v3(&action_id, ActionState::Processing, "link_v3_1");

        // Act
        repo.create(action);

        // Assert
        let result = repo.get(&action_id);
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.id, action_id);
        assert_eq!(result.link_id, "link_v3_1");
        assert_eq!(result.state, ActionState::Processing);
    }

    #[test]
    fn it_should_succeed_update_action_v3() {
        // Arrange
        let mut repo = TestRepositories::new().action_v3();
        let action_id = random_id_string();
        let initial_action = fixture_of_action_v3(&action_id, ActionState::Processing, "link_v3_1");
        repo.create(initial_action);

        let updated_action = fixture_of_action_v3(&action_id, ActionState::Success, "link_v3_2");

        // Act
        repo.update(updated_action.clone());

        // Assert
        let result = repo.get(&action_id);
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.state, ActionState::Success);
        assert_eq!(result.link_id, "link_v3_2");
        assert_eq!(result.creator, updated_action.creator);
    }

    #[test]
    fn it_should_succeed_get_action_v3_due_to_action_exists() {
        // Arrange
        let mut repo = TestRepositories::new().action_v3();
        let action_id = random_id_string();
        let action = fixture_of_action_v3(&action_id, ActionState::Created, "link_v3_1");
        repo.create(action);

        // Act
        let result = repo.get(&action_id);

        // Assert
        assert!(result.is_some());
        assert_eq!(result.unwrap().id, action_id);
    }
}
