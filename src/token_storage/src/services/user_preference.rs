// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


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
