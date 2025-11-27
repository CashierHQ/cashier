// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::{
    action::v1::ActionType,
    link_action::v1::{LinkAction, LinkActionCodec},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapIteratorStructure, BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type LinkActionRepositoryStorage =
    VersionedBTreeMap<String, LinkAction, LinkActionCodec, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Debug, Clone)]
struct LinkActionKey<'a> {
    pub link_id: &'a str,
    pub action_type: &'a ActionType,
    pub action_id: &'a str,
    pub user_id: &'a Principal,
}

impl<'a> LinkActionKey<'a> {
    pub fn to_str(&self) -> String {
        format!(
            "LINK#{}#USER#{}#TYPE#{}#ACTION#{}",
            self.link_id, self.user_id, self.action_type, self.action_id
        )
    }
}

#[derive(Clone)]
pub struct LinkActionRepository<S: Storage<LinkActionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkActionRepositoryStorage>> LinkActionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, link_action: LinkAction) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: &link_action.link_id,
                action_type: &link_action.action_type,
                action_id: &link_action.action_id,
                user_id: &link_action.user_id,
            };
            store.insert(id.to_str(), link_action);
        });
    }

    pub fn update(&mut self, link_action: LinkAction) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: &link_action.link_id,
                action_type: &link_action.action_type,
                action_id: &link_action.action_id,
                user_id: &link_action.user_id,
            };
            store.insert(id.to_str(), link_action);
        });
    }

    // Query by link_id, action_type, user_id, skip action_id
    pub fn get_by_prefix(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &Principal,
    ) -> Vec<LinkAction> {
        self.storage.with_borrow(|store| {
            let key = LinkActionKey {
                link_id,
                action_type,
                user_id,
                action_id: "",
            };

            let prefix = key.to_str();

            let link_actions: Vec<_> = store
                .range(prefix.clone()..)
                .filter(|entry| entry.0.starts_with(&prefix))
                .map(|entry| entry.1)
                .collect();

            link_actions
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::{random_id_string, random_principal_id},
    };
    use cashier_backend_types::repository::link_action::v1::LinkUserState;

    #[test]
    fn it_should_create_link_action() {
        // Arrange
        let mut repo = TestRepositories::new().link_action();
        let link_id = random_id_string();
        let user1 = random_principal_id();

        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::CreateLink,
            action_id: "action1".to_string(),
            user_id: user1,
            link_user_state: None,
        };

        // Act
        repo.create(link_action);

        // Assert
        let actions = repo.get_by_prefix(&link_id, &ActionType::CreateLink, &user1);
        assert_eq!(actions.len(), 1);
        assert!(actions.first().unwrap().link_user_state.is_none());
    }

    #[test]
    fn it_should_update_link_action() {
        // Arrange
        let mut repo = TestRepositories::new().link_action();
        let link_id = random_id_string();
        let user1 = random_principal_id();

        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: "action1".to_string(),
            user_id: user1,
            link_user_state: None,
        };
        repo.create(link_action);

        let updated_action = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: "action1".to_string(),
            user_id: user1,
            link_user_state: Some(LinkUserState::Address),
        };

        // Act
        repo.update(updated_action);

        // Assert
        let actions = repo.get_by_prefix(&link_id, &ActionType::Receive, &user1);
        assert_eq!(actions.len(), 1);
        assert_eq!(
            actions.first().unwrap().link_user_state,
            Some(LinkUserState::Address)
        );
    }

    #[test]
    fn it_should_get_link_action_by_prefix() {
        // Arrange
        let mut repo = TestRepositories::new().link_action();
        let link_id1 = random_id_string();
        let link_id2 = random_id_string();
        let user1 = random_principal_id();
        let user2 = random_principal_id();

        let link_action1 = LinkAction {
            link_id: link_id1.clone(),
            action_type: ActionType::Receive,
            action_id: "action1".to_string(),
            user_id: user1,
            link_user_state: None,
        };

        let link_action2 = LinkAction {
            link_id: link_id2.clone(),
            action_type: ActionType::Withdraw,
            action_id: "action2".to_string(),
            user_id: user2,
            link_user_state: Some(LinkUserState::Completed),
        };

        repo.create(link_action1);
        repo.create(link_action2);

        // Act
        let actions = repo.get_by_prefix(&link_id1, &ActionType::Receive, &user1);

        // Assert
        assert_eq!(actions.len(), 1);
        assert_eq!(actions.first().unwrap().link_id, link_id1);
        assert_eq!(actions.first().unwrap().action_type, ActionType::Receive);
        assert_eq!(actions.first().unwrap().action_id, "action1");
        assert_eq!(actions.first().unwrap().user_id, user1);
        assert!(actions.first().unwrap().link_user_state.is_none());

        // Act
        let actions = repo.get_by_prefix(&link_id2, &ActionType::Withdraw, &user2);

        // Assert
        assert_eq!(actions.len(), 1);
        assert_eq!(actions.first().unwrap().link_id, link_id2);
        assert_eq!(actions.first().unwrap().action_type, ActionType::Withdraw);
        assert_eq!(actions.first().unwrap().action_id, "action2");
        assert_eq!(actions.first().unwrap().user_id, user2);
        assert_eq!(
            actions.first().unwrap().link_user_state,
            Some(LinkUserState::Completed)
        );
    }
}
