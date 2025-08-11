// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::LINK_ACTION_STORE;
use cashier_types::repository::{keys::LinkActionKey, link_action::v1::LinkAction};

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
    use cashier_types::repository::link_action::v1::LinkUserState;

    use super::*;

    #[test]
    fn create() {
        let repo = LinkActionRepository::new();
        let link_action = LinkAction {
            link_id: "link1".to_string(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: None,
        };
        repo.create(link_action.clone());

        let actions = repo.get_by_prefix("link1", "type1", "user1");
        assert_eq!(actions.len(), 1);
        assert!(actions[0].link_user_state.is_none());
    }

    #[test]
    fn update() {
        let repo = LinkActionRepository::new();
        let link_action = LinkAction {
            link_id: "link1".to_string(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: None,
        };
        repo.create(link_action.clone());


        let updated_action = LinkAction {
            link_id: "link1".to_string(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: Some(LinkUserState::ChooseWallet),
        };
        repo.update(updated_action.clone());

        let actions = repo.get_by_prefix("link1", "type1", "user1");
        assert_eq!(actions.len(), 1);
        assert_eq!(actions[0].link_user_state, Some(LinkUserState::ChooseWallet));
    }


    #[test]
    fn get_by_prefix() {
        let repo = LinkActionRepository::new();
        let link_action1 = LinkAction {
            link_id: "link1".to_string(),
            action_type: "type1".to_string(),
            action_id: "action1".to_string(),
            user_id: "user1".to_string(),
            link_user_state: None,
        };

        let link_action2 = LinkAction {
            link_id: "link2".to_string(),
            action_type: "type2".to_string(),
            action_id: "action2".to_string(),
            user_id: "user2".to_string(),
            link_user_state: Some(LinkUserState::CompletedLink),
        };

        repo.create(link_action1);
        repo.create(link_action2);

        let actions = repo.get_by_prefix("link1", "type1", "user1");
        assert_eq!(actions.len(), 1);
        assert_eq!(actions[0].link_id, "link1");
        assert_eq!(actions[0].action_type, "type1");
        assert_eq!(actions[0].action_id, "action1");
        assert_eq!(actions[0].user_id, "user1");
        assert!(actions[0].link_user_state.is_none());

        let actions = repo.get_by_prefix("link2", "type2", "user2");
        assert_eq!(actions.len(), 1);
        assert_eq!(actions[0].link_id, "link2");
        assert_eq!(actions[0].action_type, "type2");
        assert_eq!(actions[0].action_id, "action2");
        assert_eq!(actions[0].user_id, "user2");
        assert_eq!(actions[0].link_user_state, Some(LinkUserState::CompletedLink));
    }

    #[test]
    fn default() {
        let repo = LinkActionRepository::default();
        let actions = repo.get_by_prefix("nonexistent", "type", "user");
        assert!(actions.is_empty());
    }

}
    
