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

// File: src/token_storage/src/services/user_perference.rs
use crate::repository::user_preference::UserPreferenceRepository;
use crate::types::UserPreference;

pub struct UserPreferenceService {
    repository: UserPreferenceRepository,
}

impl UserPreferenceService {
    pub fn new() -> Self {
        Self {
            repository: UserPreferenceRepository::new(),
        }
    }

    /// Get user preferences for the specified user
    pub fn get_preferences(&self, user_id: &String) -> UserPreference {
        self.repository.get(user_id)
    }

    /// Set user preferences
    pub fn set_preferences(&self, user_id: String, preferences: UserPreference) {
        if self.repository.has_preferences(&user_id) {
            self.repository.update(user_id, preferences);
        } else {
            self.repository.add(user_id, preferences);
        }
    }

    /// Reset user preferences to default
    pub fn reset_preferences(&self, user_id: &String) {
        self.repository.reset(user_id);
    }

    /// Check if user has preferences
    pub fn has_preferences(&self, user_id: &String) -> bool {
        self.repository.has_preferences(user_id)
    }
}
