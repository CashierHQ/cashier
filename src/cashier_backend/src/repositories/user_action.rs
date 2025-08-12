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
