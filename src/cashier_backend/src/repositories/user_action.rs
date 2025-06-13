// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use super::VERSIONED_USER_ACTION_STORE;
use cashier_types::{user_action::v1::UserAction, UserActionKey, VersionedUserAction};

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct UserActionRepository {}

#[cfg_attr(test, faux::methods)]
impl UserActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, user_intent: UserAction) {
        VERSIONED_USER_ACTION_STORE.with_borrow_mut(|store| {
            let id = UserActionKey {
                user_id: user_intent.user_id.clone(),
                action_id: user_intent.action_id.clone(),
            };
            let versioned_user_action =
                VersionedUserAction::build(CURRENT_DATA_VERSION, user_intent)
                    .expect("Failed to create versioned user action");
            store.insert(id.to_str(), versioned_user_action);
        });
    }
}
