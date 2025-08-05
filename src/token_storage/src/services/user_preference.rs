// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// File: src/token_storage/src/services/user_perference.rs
use crate::repository::user_preference::UserPreferenceRepository;
use crate::types::UserPreference;

pub struct UserPreferenceService {
    repository: UserPreferenceRepository,
}

impl Default for UserPreferenceService {
    fn default() -> Self {
        Self::new()
    }
}

impl UserPreferenceService {
    pub fn new() -> Self {
        Self {
            repository: UserPreferenceRepository::new(),
        }
    }

    /// Get user preferences for the specified user
    pub fn get_preferences(&self, user_id: &str) -> UserPreference {
        self.repository.get(user_id)
    }
}
