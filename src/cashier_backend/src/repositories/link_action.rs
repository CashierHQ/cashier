// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::LINK_ACTION_STORE;
use cashier_backend_types::repository::{keys::LinkActionKey, link_action::v1::LinkAction};

#[derive(Clone)]

pub struct LinkActionRepository {}

impl Default for LinkActionRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl LinkActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, link_action: LinkAction) {
        LINK_ACTION_STORE.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: link_action.link_id.clone(),
                action_type: link_action.action_type.clone(),
                action_id: link_action.action_id.clone(),
                user_id: link_action.user_id.clone(),
            };
            store.insert(id.to_str(), link_action);
        });
    }

    pub fn update(&self, link_action: LinkAction) {
        LINK_ACTION_STORE.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: link_action.link_id.clone(),
                action_type: link_action.action_type.clone(),
                action_id: link_action.action_id.clone(),
                user_id: link_action.user_id.clone(),
            };
            store.insert(id.to_str(), link_action);
        });
    }

    // Query by link_id, action_type, user_id, skip action_id
    pub fn get_by_prefix(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Vec<LinkAction> {
        LINK_ACTION_STORE.with_borrow(|store| {
            let key: LinkActionKey = LinkActionKey {
                link_id: link_id.to_string(),
                action_type: action_type.to_string(),
                user_id: user_id.to_string(),
                action_id: "".to_string(),
            };

            let prefix = key.to_str();

            let link_actions: Vec<_> = store
                .range(prefix.clone()..)
                .filter(|entry| entry.key().starts_with(&prefix))
                .map(|entry| entry.value())
                .collect();

            link_actions
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::random_id_string;
    use cashier_backend_types::repository::link_action::v1::LinkUserState;

    #[test]
    fn it_should_create_link_action() {
        // Arrange
        let repo = LinkActionRepository::new();
        let link_id = random_id_string();

        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: None,
        };

        // Act
        repo.create(link_action);

        // Assert
        let actions = repo.get_by_prefix(&link_id, "type1", "user1");
        assert_eq!(actions.len(), 1);
        assert!(actions.first().unwrap().link_user_state.is_none());
    }

    #[test]
    fn it_should_update_link_action() {
        // Arrange
        let repo = LinkActionRepository::new();
        let link_id = random_id_string();
        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: None,
        };
        repo.create(link_action);

        let updated_action = LinkAction {
            link_id: link_id.clone(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: Some(LinkUserState::ChooseWallet),
        };

        // Act
        repo.update(updated_action);

        // Assert
        let actions = repo.get_by_prefix(&link_id, "type1", "user1");
        assert_eq!(actions.len(), 1);
        assert_eq!(
            actions.first().unwrap().link_user_state,
            Some(LinkUserState::ChooseWallet)
        );
    }

    #[test]
    fn it_should_get_link_action_by_prefix() {
        // Arrange
        let repo = LinkActionRepository::new();
        let link_id1 = random_id_string();
        let link_id2 = random_id_string();
        let link_action1 = LinkAction {
            link_id: link_id1.clone(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: None,
        };

        let link_action2 = LinkAction {
            link_id: link_id2.clone(),
            action_type: "type2".to_string(),
            action_id: "action2".to_string(),
            user_id: "user2".to_string(),
            link_user_state: Some(LinkUserState::CompletedLink),
        };

        repo.create(link_action1);
        repo.create(link_action2);

        // Act
        let actions = repo.get_by_prefix(&link_id1, "type1", "user1");

        // Assert
        assert_eq!(actions.len(), 1);
        assert_eq!(actions.first().unwrap().link_id, link_id1);
        assert_eq!(actions.first().unwrap().action_type, "type1");
        assert_eq!(actions.first().unwrap().action_id, "action1");
        assert_eq!(actions.first().unwrap().user_id, "user1");
        assert!(actions.first().unwrap().link_user_state.is_none());

        // Act
        let actions = repo.get_by_prefix(&link_id2, "type2", "user2");

        // Assert
        assert_eq!(actions.len(), 1);
        assert_eq!(actions.first().unwrap().link_id, link_id2);
        assert_eq!(actions.first().unwrap().action_type, "type2");
        assert_eq!(actions.first().unwrap().action_id, "action2");
        assert_eq!(actions.first().unwrap().user_id, "user2");
        assert_eq!(
            actions.first().unwrap().link_user_state,
            Some(LinkUserState::CompletedLink)
        );
    }

    #[test]
    fn it_should_create_link_action_repository_by_default() {
        // Arrange
        let repo = LinkActionRepository::default();

        // Act
        let actions = repo.get_by_prefix("nonexistent", "type", "user");

        // Assert
        assert!(actions.is_empty());
    }
}
