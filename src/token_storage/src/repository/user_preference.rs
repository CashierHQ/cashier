// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::user::UserPreference;

// File: src/token_storage/src/repository/user_preference.rs
use super::USER_PREFERENCE_STORE;

pub struct UserPreferenceRepository {}

impl Default for UserPreferenceRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl UserPreferenceRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn get(&self, id: &Principal) -> UserPreference {
        USER_PREFERENCE_STORE
            .with_borrow(|store| store.get(id))
            .unwrap_or_default()
    }

    pub fn update(&self, id: Principal, user_preference: UserPreference) {
        USER_PREFERENCE_STORE.with_borrow_mut(|store| {
            store.insert(id, user_preference);
        });
    }
}
