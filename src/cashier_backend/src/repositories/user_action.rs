// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::USER_ACTION_STORE;
use cashier_types::repository::{keys::UserActionKey, user_action::v1::UserAction};

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

    #[test]
    fn it_should_create_an_user_action() {
        let repo = UserActionRepository::new();
        let user_action = UserAction {
            user_id: "user1".to_string(),
            action_id: "action1".to_string(),
        };
        repo.create(user_action);

        let retrieved_action = USER_ACTION_STORE.with_borrow(|store| {
            store.get(
                &UserActionKey {
                    user_id: "user1".to_string(),
                    action_id: "action1".to_string(),
                }
                .to_str(),
            )
        });
        assert!(retrieved_action.is_some());
        assert_eq!(retrieved_action.unwrap().user_id, "user1");
    }

    #[test]
    fn it_should_create_a_user_action_repository_by_default() {
        let repo = UserActionRepository::default();
        let user_action = UserAction {
            user_id: "user1".to_string(),
            action_id: "action1".to_string(),
        };
        repo.create(user_action);

        let retrieved_action = USER_ACTION_STORE.with_borrow(|store| {
            store.get(
                &UserActionKey {
                    user_id: "user1".to_string(),
                    action_id: "action1".to_string(),
                }
                .to_str(),
            )
        });
        assert!(retrieved_action.is_some());
        assert_eq!(retrieved_action.unwrap().user_id, "user1");
    }
}
