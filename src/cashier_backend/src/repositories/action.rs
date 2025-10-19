// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{
    action::v1::{Action, ActionCodec},
    keys::ActionKey,
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type ActionRepositoryStorage =
    VersionedBTreeMap<ActionKey, Action, ActionCodec, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct ActionRepository<S: Storage<ActionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<ActionRepositoryStorage>> ActionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, action: Action) {
        self.storage.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }

    pub fn get(&self, action_id: &str) -> Option<Action> {
        self.storage
            .with_borrow(|store| store.get(&action_id.to_string()))
    }

    pub fn update(&mut self, action: Action) {
        self.storage.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::{random_id_string, random_principal_id},
    };
    use cashier_backend_types::repository::action::v1::{ActionState, ActionType};

    #[test]
    fn it_should_create_an_action() {
        // Arrange
        let mut repo = TestRepositories::new().action();
        let action_id = random_id_string();
        let action = Action {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Processing,
            creator: random_principal_id(),
            link_id: "link1".to_string(),
        };

        // Act
        repo.create(action);

        // Assert
        let retrieved_action = repo.get(&action_id);
        let retrieved_action = retrieved_action.expect("Action should be found");
        assert_eq!(retrieved_action.id, action_id);
    }

    #[test]
    fn it_should_update_an_action() {
        // Arrange
        let mut repo = TestRepositories::new().action();
        let action_id = random_id_string();
        let action = Action {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Processing,
            creator: random_principal_id(),
            link_id: "link1".to_string(),
        };
        repo.create(action);

        let updated_action = Action {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Success,
            creator: random_principal_id(),
            link_id: "link2".to_string(),
        };

        // Act
        repo.update(updated_action.clone());

        // Assert
        let retrieved_action = repo.get(&action_id);
        assert!(retrieved_action.is_some());
        let action = retrieved_action.expect("Action should be found");
        assert_eq!(action.state, ActionState::Success);
        assert_eq!(action.creator, updated_action.creator);
        assert_eq!(action.link_id, "link2");
    }

    #[test]
    fn it_should_get_non_existent() {
        // Arrange
        let repo = TestRepositories::new().action();

        // Act
        let retrieved_action = repo.get("non_existent_action");

        // Assert
        assert!(retrieved_action.is_none());
    }

    #[test]
    fn it_should_get_existent() {
        // Arrange
        let mut repo = TestRepositories::new().action();
        let action_id = random_id_string();
        let action = Action {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: random_principal_id(),
            link_id: "link1".to_string(),
        };
        repo.create(action);

        // Act
        let retrieved_action = repo.get(&action_id);

        // Assert
        assert!(retrieved_action.is_some());
        let retrieved_action = retrieved_action.expect("Action should be found");
        assert_eq!(retrieved_action.id, action_id);
    }
}
