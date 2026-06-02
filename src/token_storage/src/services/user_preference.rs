// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::user::UserPreference;

// File: src/token_storage/src/services/user_perference.rs
use crate::repository::{Repositories, user_preference::UserPreferenceRepository};

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
    /// # Arguments
    /// * `user_id` - The ID of the user to get preferences for
    /// # Returns
    /// * `UserPreference` - The preferences for the user, or default preferences if none are set
    pub fn get_preferences(&self, user_id: &Principal) -> UserPreference {
        self.repository.get(user_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};
    use cashier_common::chain::Chain;

    fn fixture_of_user_preference() -> UserPreference {
        UserPreference {
            hide_zero_balance: true,
            hide_unknown_token: true,
            selected_chain: vec![Chain::IC],
        }
    }

    #[test]
    fn it_should_do_return_default_preferences_due_to_missing_user_preference() {
        // Arrange
        let repositories = TestRepositories::new();
        let user_preference_service = UserPreferenceService::new(&repositories);
        let user_id = Principal::anonymous();

        // Act
        let result = user_preference_service.get_preferences(&user_id);

        // Assert
        assert_eq!(result, UserPreference::default());
    }

    #[test]
    fn it_should_do_get_user_preferences() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut user_preference_repository = repositories.user_preference();
        let user_preference_service = UserPreferenceService::new(&repositories);
        let user_id = Principal::anonymous();
        let user_preference = fixture_of_user_preference();
        user_preference_repository.update(user_id, user_preference.clone());

        // Act
        let result = user_preference_service.get_preferences(&user_id);

        // Assert
        assert_eq!(result, user_preference);
    }
}
