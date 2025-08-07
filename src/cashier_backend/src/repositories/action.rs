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
