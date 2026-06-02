// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use token_storage_types::user::{UserPreference, UserPreferenceCodec};

/// Store for UserPreferenceRepository
pub type UserPreferenceRepositoryStorage = VersionedBTreeMap<
    Principal,
    UserPreference,
    UserPreferenceCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalUserPreferenceRepositoryStorage =
    &'static LocalKey<RefCell<UserPreferenceRepositoryStorage>>;

pub struct UserPreferenceRepository<S: Storage<UserPreferenceRepositoryStorage>> {
    user_pref_storage: S,
}

impl<S: Storage<UserPreferenceRepositoryStorage>> UserPreferenceRepository<S> {
    /// Create a new UserPreferenceRepository
    pub fn new(storage: S) -> Self {
        Self {
            user_pref_storage: storage,
        }
    }

    /// Get the user preference for a given user ID
    /// # Arguments
    /// * `id` - The ID of the user to get preferences for
    /// # Returns
    /// * `UserPreference` - The preferences for the user, or default preferences if none are set
    pub fn get(&self, id: &Principal) -> UserPreference {
        self.user_pref_storage
            .with_borrow(|store| store.get(id))
            .unwrap_or_default()
    }

    /// Update the user preference for a given user ID
    /// # Arguments
    /// * `id` - The ID of the user to update preferences for
    /// * `user_preference` - The new preferences to set for the user
    pub fn update(&mut self, id: Principal, user_preference: UserPreference) {
        self.user_pref_storage.with_borrow_mut(|store| {
            store.insert(id, user_preference);
        });
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
    fn it_should_do_get_default_user_preference_due_to_missing_record() {
        // Arrange
        let repo = TestRepositories::new();
        let user_preference_repository = repo.user_preference();
        let user_id = Principal::anonymous();

        // Act
        let result = user_preference_repository.get(&user_id);

        // Assert
        assert_eq!(result, UserPreference::default());
    }

    #[test]
    fn it_should_do_update_user_preference() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_preference_repository = repo.user_preference();
        let user_id = Principal::anonymous();
        let user_preference = fixture_of_user_preference();

        // Act
        user_preference_repository.update(user_id, user_preference.clone());
        let result = user_preference_repository.get(&user_id);

        // Assert
        assert_eq!(result, user_preference);
    }

    #[test]
    fn it_should_do_overwrite_existing_user_preference() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_preference_repository = repo.user_preference();
        let user_id = Principal::anonymous();
        let initial_user_preference = UserPreference {
            hide_zero_balance: false,
            hide_unknown_token: false,
            selected_chain: vec![Chain::IC],
        };
        let updated_user_preference = fixture_of_user_preference();
        user_preference_repository.update(user_id, initial_user_preference);

        // Act
        user_preference_repository.update(user_id, updated_user_preference.clone());
        let result = user_preference_repository.get(&user_id);

        // Assert
        assert_eq!(result, updated_user_preference);
    }
}
