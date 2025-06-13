// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


// File: src/token_storage/src/repository/user_preference.rs
use super::USER_PREFERENCE_STORE;
use crate::types::UserPreference;

pub struct UserPreferenceRepository {}

impl UserPreferenceRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn add(&self, id: String, user_preference: UserPreference) {
        USER_PREFERENCE_STORE.with_borrow_mut(|store| {
            store.insert(id, user_preference);
        });
    }

    pub fn get(&self, id: &String) -> UserPreference {
        USER_PREFERENCE_STORE
            .with_borrow(|store| store.get(id))
            .unwrap_or(UserPreference::default())
    }

    pub fn update(&self, id: String, user_preference: UserPreference) {
        USER_PREFERENCE_STORE.with_borrow_mut(|store| {
            store.insert(id, user_preference);
        });
    }

    pub fn delete(&self, id: &String) -> bool {
        USER_PREFERENCE_STORE.with_borrow_mut(|store| store.remove(id).is_some())
    }

    pub fn has_preferences(&self, id: &String) -> bool {
        USER_PREFERENCE_STORE.with_borrow(|store| store.contains_key(id))
    }

    // Reset to default preferences
    pub fn reset(&self, id: &String) {
        USER_PREFERENCE_STORE.with_borrow_mut(|store| {
            store.insert(id.clone(), UserPreference::default());
        });
    }
}
