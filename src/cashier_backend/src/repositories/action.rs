// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use cashier_types::{action::v1::Action, ActionKey, VersionedAction};

use crate::repositories::VERSIONED_ACTION_STORE;

const CURRENT_DATA_VERSION: u32 = 1;
#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct ActionRepository {}

#[cfg_attr(test, faux::methods)]
impl ActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, action: Action) {
        VERSIONED_ACTION_STORE.with_borrow_mut(|store| {
            let id = action.id.clone();
            let versioned_action = VersionedAction::build(CURRENT_DATA_VERSION, action)
                .expect("Failed to create versioned action");
            store.insert(id, versioned_action);
        });
    }

    pub fn get(&self, action_id: ActionKey) -> Option<Action> {
        VERSIONED_ACTION_STORE.with_borrow(|store| {
            store
                .get(&action_id)
                .map(|versioned_action| versioned_action.into_action())
        })
    }

    pub fn batch_get(&self, ids: Vec<ActionKey>) -> Vec<Action> {
        VERSIONED_ACTION_STORE.with_borrow(|store| {
            ids.into_iter()
                .filter_map(|id| store.get(&id))
                .map(|versioned_action| versioned_action.into_action())
                .collect()
        })
    }

    pub fn update(&self, action: Action) {
        VERSIONED_ACTION_STORE.with_borrow_mut(|store| {
            let id = action.id.clone();
            let versioned_action = VersionedAction::build(CURRENT_DATA_VERSION, action)
                .expect("Failed to create versioned action");
            store.insert(id, versioned_action);
        });
    }
}
