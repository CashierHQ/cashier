// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::{action::v1::Action, keys::ActionKey};

use crate::repositories::ACTION_STORE;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct ActionRepository {}

#[cfg_attr(test, faux::methods)]
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

    pub fn get(&self, action_id: ActionKey) -> Option<Action> {
        ACTION_STORE.with_borrow(|store| store.get(&action_id))
    }

    pub fn batch_get(&self, ids: Vec<ActionKey>) -> Vec<Action> {
        ACTION_STORE.with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn update(&self, action: Action) {
        ACTION_STORE.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }
}
