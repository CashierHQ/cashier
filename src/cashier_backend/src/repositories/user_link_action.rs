// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::{
    action::v1::ActionType,
    link_action::v1::LinkAction,
    user_link_action::v1::{UserLinkActionCodec, UserLinkActionKey},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type UserLinkActionRepositoryStorage = VersionedBTreeMap<
    String,
    Vec<LinkAction>,
    UserLinkActionCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;

#[derive(Clone)]
pub struct UserLinkActionRepository<S: Storage<UserLinkActionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<UserLinkActionRepositoryStorage>> UserLinkActionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Create a new user link action
    /// # Arguments
    /// * `link_action` - The LinkAction to be created
    /// # Returns
    /// * `()` - if successful
    pub fn create(&mut self, link_action: LinkAction) {
        self.storage.with_borrow_mut(|store| {
            let id = UserLinkActionKey {
                user_id: link_action.user_id,
                link_id: link_action.link_id.clone(),
                action_type: link_action.action_type.clone(),
            };
            let id_str = id.to_str();

            let mut actions = store.get(&id_str).unwrap_or(Vec::new());
            actions.push(link_action);
            store.insert(id_str, actions);
        });
    }

    /// Get all link actions for a given user, link, and action type
    /// # Arguments
    /// * `user_id` - The Principal ID of the user
    /// * `link_id` - The ID of the link
    /// * `action_type` - The type of action
    /// # Returns
    /// * `Option<Vec<LinkAction>>` - A vector of LinkAction if found, otherwise None
    pub fn get_actions_by_user_link_and_type(
        &self,
        user_id: Principal,
        link_id: &str,
        action_type: &ActionType,
    ) -> Option<Vec<LinkAction>> {
        self.storage.with_borrow(|store| {
            let id = UserLinkActionKey {
                user_id,
                link_id: link_id.to_string(),
                action_type: action_type.clone(),
            };
            store.get(&id.to_str())
        })
    }
}

#[cfg(test)]
mod tests {
    use cashier_backend_types::repository::action::v1::ActionType;

    use super::*;
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::*,
    };

    #[test]
    fn it_should_create_an_user_link_action() {
        // Arrange
        let mut repo = TestRepositories::new().user_link_action();
        let link_id = random_id_string();
        let user1 = random_principal_id();
        let action_id = random_id_string();

        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: action_id.clone(),
            user_id: user1,
            link_user_state: None,
        };

        // Act
        repo.create(link_action);

        let retrieved_action = repo.storage.with_borrow(|store| {
            store.get(
                &UserLinkActionKey {
                    user_id: user1,
                    link_id: link_id.clone(),
                    action_type: ActionType::Receive,
                }
                .to_str(),
            )
        });
        assert!(retrieved_action.is_some());
        let actions = retrieved_action.unwrap();
        assert_eq!(actions.len(), 1);
        let action = &actions[0];
        assert_eq!(action.user_id, user1);
        assert_eq!(action.link_id, link_id);
        assert_eq!(action.action_type, ActionType::Receive);
        assert_eq!(action.action_id, action_id);
    }

    #[test]
    fn it_should_get_actions_by_user_link_and_type() {
        // Arrange
        let mut repo = TestRepositories::new().user_link_action();
        let link_id = random_id_string();
        let user1 = random_principal_id();
        let action_id1 = random_id_string();
        let action_id2 = random_id_string();

        let link_action1 = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: action_id1.clone(),
            user_id: user1,
            link_user_state: None,
        };
        let link_action2 = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: action_id2.clone(),
            user_id: user1,
            link_user_state: None,
        };
        repo.create(link_action1);
        repo.create(link_action2);

        // Act
        let actions = repo.get_actions_by_user_link_and_type(user1, &link_id, &ActionType::Receive);

        // Assert
        assert!(actions.is_some());
        let actions = actions.unwrap();
        assert_eq!(actions.len(), 2);
        assert_eq!(actions[0].action_id, action_id1);
        assert_eq!(actions[1].action_id, action_id2);
        assert_eq!(actions[0].action_type, ActionType::Receive);
        assert_eq!(actions[1].action_type, ActionType::Receive);
    }
}
