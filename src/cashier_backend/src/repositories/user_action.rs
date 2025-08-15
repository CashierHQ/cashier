// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::USER_ACTION_STORE;
use cashier_backend_types::repository::{keys::UserActionKey, user_action::v1::UserAction};

#[derive(Clone)]

pub struct UserActionRepository {}

impl Default for UserActionRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl UserActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, user_intent: UserAction) {
        USER_ACTION_STORE.with_borrow_mut(|store| {
            let id = UserActionKey {
                user_id: user_intent.user_id.clone(),
                action_id: user_intent.action_id.clone(),
            };
            store.insert(id.to_str(), user_intent);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::*;

    #[test]
    fn it_should_create_an_user_action() {
        // Arrange
        let repo = UserActionRepository::new();
        let user_id = random_principal_id();
        let action_id = random_id_string();
        let user_action = UserAction {
            user_id: user_id.clone(),
            action_id: action_id.clone(),
        };

        // Act
        repo.create(user_action);

        // Assert
        let retrieved_action = USER_ACTION_STORE.with_borrow(|store| {
            store.get(
                &UserActionKey {
                    user_id: user_id.clone(),
                    action_id: action_id.clone(),
                }
                .to_str(),
            )
        });
        assert!(retrieved_action.is_some());
        assert_eq!(retrieved_action.unwrap().user_id, user_id);
    }

    #[test]
    fn it_should_create_a_user_action_repository_by_default() {
        // Arrange
        let repo = UserActionRepository::default();
        let user_id = random_principal_id();
        let action_id = random_id_string();
        let user_action = UserAction {
            user_id: user_id.clone(),
            action_id: action_id.clone(),
        };

        // Act
        repo.create(user_action);

        // Assert
        let retrieved_action = USER_ACTION_STORE.with_borrow(|store| {
            store.get(
                &UserActionKey {
                    user_id: user_id.clone(),
                    action_id: action_id.clone(),
                }
                .to_str(),
            )
        });
        assert!(retrieved_action.is_some());
        assert_eq!(retrieved_action.unwrap().user_id, user_id);
    }
}
