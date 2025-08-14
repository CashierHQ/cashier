// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::user::UserPreference;

// File: src/token_storage/src/services/user_perference.rs
use crate::repository::{
    Repositories, user_preference::UserPreferenceRepository,
};

pub struct UserPreferenceService<R: Repositories> {
    repository: UserPreferenceRepository<R::UserPreference>,
}

impl<R: Repositories> UserPreferenceService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            repository: repo.user_preference(),
        }
    }

    /// Get user preferences for the specified user
    pub fn get_preferences(&self, user_id: &Principal) -> UserPreference {
        self.repository.get(user_id)
    }
}
