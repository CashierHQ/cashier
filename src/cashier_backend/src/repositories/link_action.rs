// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use super::VERSIONED_LINK_ACTION_STORE;
use cashier_types::{
    keys::ActionTypeKey, link_action::v1::LinkAction, LinkActionKey, LinkKey, VersionedLinkAction,
};

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct LinkActionRepository {}

#[cfg_attr(test, faux::methods)]
impl LinkActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, link_action: LinkAction) {
        VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: link_action.link_id.clone(),
                action_type: link_action.action_type.clone(),
                action_id: link_action.action_id.clone(),
                user_id: link_action.user_id.clone(),
            };
            let versioned_link_action =
                VersionedLinkAction::build(CURRENT_DATA_VERSION, link_action)
                    .expect("Failed to create versioned link action");
            store.insert(id.to_str(), versioned_link_action);
        });
    }

    pub fn update(&self, link_action: LinkAction) {
        VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: link_action.link_id.clone(),
                action_type: link_action.action_type.clone(),
                action_id: link_action.action_id.clone(),
                user_id: link_action.user_id.clone(),
            };
            let versioned_link_action =
                VersionedLinkAction::build(CURRENT_DATA_VERSION, link_action)
                    .expect("Failed to create versioned link action");
            store.insert(id.to_str(), versioned_link_action);
        });
    }

    pub fn get(&self, id: LinkActionKey) -> Option<LinkAction> {
        VERSIONED_LINK_ACTION_STORE.with_borrow(|store| {
            store
                .get(&id.to_str())
                .map(|versioned_data| versioned_data.into_link_action())
        })
    }

    // Query by link_id, action_type, user_id, skip action_id
    pub fn get_by_prefix(
        &self,
        link_id: LinkKey,
        action_type: ActionTypeKey,
        user_id: String,
    ) -> Vec<LinkAction> {
        VERSIONED_LINK_ACTION_STORE.with_borrow(|store| {
            let key: LinkActionKey = LinkActionKey {
                link_id: link_id.clone(),
                action_type: action_type.clone(),
                user_id: user_id.clone(),
                action_id: "".to_string(),
            };

            let prefix = key.to_str().clone();

            let link_actions: Vec<_> = store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.into_link_action())
                .collect();

            link_actions
        })
    }

    pub fn delete(&self, id: LinkActionKey) {
        VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|store| {
            store.remove(&id.to_str());
        });
    }
}
