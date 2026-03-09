// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::{
    action::v1::ActionType,
    link_action::v1::{LinkAction, LinkActionCodec},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_backend_types::repository::link_action::v1::LinkUserState;
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_of_link_action(
        link_id: &str,
        action_id: &str,
        action_type: ActionType,
        user_id: Principal,
        link_user_state: Option<LinkUserState>,
    ) -> LinkAction {
        LinkAction {
            link_id: link_id.to_string(),
            action_id: action_id.to_string(),
            action_type,
            user_id,
            link_user_state,
        }
    }

    fn fixture_of_link_action_key(
        link_id: &str,
        action_type: &ActionType,
        action_id: &str,
        user_id: &Principal,
    ) -> String {
        format!(
            "LINK#{}#USER#{}#TYPE#{}#ACTION#{}",
            link_id, user_id, action_type, action_id
        )
    }

    #[test]
    fn it_should_fail_get_link_action_due_to_non_existent_key() {
        // Arrange
        let repo = TestRepositories::new().link_action();
        let key = fixture_of_link_action_key(
            "unknown_link",
            &ActionType::CreateLink,
            "unknown_action",
            &random_principal_id(),
        );

        // Act
        let result = repo.storage.with_borrow(|store| store.get(&key));

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_succeed_create_link_action() {
        // Arrange
        let mut repo = TestRepositories::new().link_action();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let user_id = random_principal_id();
        let link_action = fixture_of_link_action(
            &link_id,
            &action_id,
            ActionType::CreateLink,
            user_id,
            Some(LinkUserState::Address),
        );
        let key = fixture_of_link_action_key(
            &link_id,
            &ActionType::CreateLink,
            &action_id,
            &user_id,
        );

        // Act
        repo.create(link_action.clone());

        // Assert
        let stored = repo.storage.with_borrow(|store| store.get(&key));
        assert!(stored.is_some());
        let stored = stored.unwrap();
        assert_eq!(stored.link_id, link_action.link_id);
        assert_eq!(stored.action_id, link_action.action_id);
        assert_eq!(stored.action_type, link_action.action_type);
        assert_eq!(stored.user_id, link_action.user_id);
        assert_eq!(stored.link_user_state, link_action.link_user_state);
    }

    #[test]
    fn it_should_succeed_overwrite_link_action_due_to_same_composite_key() {
        // Arrange
        let mut repo = TestRepositories::new().link_action();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let user_id = random_principal_id();
        let key = fixture_of_link_action_key(
            &link_id,
            &ActionType::Receive,
            &action_id,
            &user_id,
        );

        let initial = fixture_of_link_action(
            &link_id,
            &action_id,
            ActionType::Receive,
            user_id,
            Some(LinkUserState::GateOpened),
        );
        let updated = fixture_of_link_action(
            &link_id,
            &action_id,
            ActionType::Receive,
            user_id,
            Some(LinkUserState::Completed),
        );
        repo.create(initial);

        // Act
        repo.create(updated.clone());

        // Assert
        let stored = repo.storage.with_borrow(|store| store.get(&key));
        assert!(stored.is_some());
        assert_eq!(stored.unwrap().link_user_state, Some(LinkUserState::Completed));
    }
}
