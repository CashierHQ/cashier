// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::action::v1::Action;

use crate::repositories::ACTION_STORE;

#[derive(Clone)]
pub struct ActionRepository {}

impl Default for ActionRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, action: Action) {
        ACTION_STORE.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }

    pub fn get(&self, action_id: &str) -> Option<Action> {
        ACTION_STORE.with_borrow(|store| store.get(&action_id.to_string()))
    }

    pub fn update(&self, action: Action) {
        ACTION_STORE.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_types::repository::action::v1::{ActionState, ActionType};

    #[test]
    fn create() {
        let repo = ActionRepository::new();
        let action = Action {
            id: "action1".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Processing,
            creator: "creator1".to_string(),
            link_id: "link1".to_string(),
        };
        repo.create(action);

        let retrieved_action = repo.get("action1");
        let retrieved_action = retrieved_action.expect("Action should be found");
        assert_eq!(retrieved_action.id, "action1");
    }

    #[test]
    fn update() {
        let repo = ActionRepository::new();
        let action = Action {
            id: "action1".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Processing,
            creator: "creator1".to_string(),
            link_id: "link1".to_string(),
        };
        repo.create(action);

        let updated_action = Action {
            id: "action1".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Success,
            creator: "creator2".to_string(),
            link_id: "link2".to_string(),
        };
        repo.update(updated_action);

        let retrieved_action = repo.get("action1");
        assert!(retrieved_action.is_some());
        let action = retrieved_action.expect("Action should be found");
        assert_eq!(action.state, ActionState::Success);
        assert_eq!(action.creator, "creator2");
        assert_eq!(action.link_id, "link2");
    }

    #[test]
    fn get_non_existent() {
        let repo = ActionRepository::new();
        let retrieved_action = repo.get("non_existent_action");
        assert!(retrieved_action.is_none());
    }

    #[test]
    fn get_existent() {
        let repo = ActionRepository::new();
        let action = Action {
            id: "action1".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: "creator1".to_string(),
            link_id: "link1".to_string(),
        };
        repo.create(action);

        let retrieved_action = repo.get("action1");
        assert!(retrieved_action.is_some());
        let retrieved_action = retrieved_action.expect("Action should be found");
        assert_eq!(retrieved_action.id, "action1");
    }

    #[test]
    fn default() {
        let repo = ActionRepository::default();
        let action = Action {
            id: "default_action".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: "default_creator".to_string(),
            link_id: "default_link".to_string(),
        };
        repo.create(action);

        let retrieved_action = repo.get("default_action");
        assert!(retrieved_action.is_some());
        assert_eq!(retrieved_action.unwrap().id, "default_action");
    }
}
