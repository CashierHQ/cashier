// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::user::UserPreference;

// File: src/token_storage/src/services/user_perference.rs
use crate::repository::{user_preference::{
   UserPreferenceRepository,
}, Repositories, ThreadlocalRepositories};

pub struct UserPreferenceService<R: Repositories> {
    repository: UserPreferenceRepository<R::UserPreference>,
}

impl UserPreferenceService<ThreadlocalRepositories> {
    pub fn new() -> Self {
        Self::new_with_repo(&ThreadlocalRepositories)
    }
}

impl <R: Repositories> UserPreferenceService<R> {

    pub fn new_with_repo(repo: &R) -> Self {
        Self {
            repository: repo.user_preference(),
        }
    }

    /// Get user preferences for the specified user
    pub fn get_preferences(&self, user_id: &Principal) -> UserPreference {
        self.repository.get(user_id)
    }
}
