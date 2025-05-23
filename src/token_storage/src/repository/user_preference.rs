// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
