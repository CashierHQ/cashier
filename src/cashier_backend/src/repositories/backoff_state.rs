// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::BTreeMap;

use candid::Principal;
use ic_mple_log::service::Storage;

/// Per-user exponential backoff state. Stored on the heap — resets on canister upgrade.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct BackoffState {
    /// Number of consecutive failed gate attempts.
    pub failure_count: u32,
    /// IC timestamp (nanoseconds) before which the next attempt is blocked.
    pub next_allowed_ns: u64,
}

pub type BackoffStateRepositoryStorage = BTreeMap<Principal, BackoffState>;

/// Repository for per-user backoff state.
pub struct BackoffStateRepository<S: Storage<BackoffStateRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<BackoffStateRepositoryStorage>> BackoffStateRepository<S> {
    /// Create a new BackoffStateRepository.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Get the current backoff state for a user.
    pub fn get(&self, user: &Principal) -> Option<BackoffState> {
        self.storage.with_borrow(|store| store.get(user).cloned())
    }

    /// Insert or overwrite the backoff state for a user.
    pub fn insert(&mut self, user: &Principal, state: BackoffState) {
        self.storage
            .with_borrow_mut(|store| store.insert(*user, state));
    }

    /// Remove the backoff state for a user.
    pub fn remove(&mut self, user: &Principal) {
        self.storage.with_borrow_mut(|store| store.remove(user));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::random_principal_id;

    fn fixture_of_state(failure_count: u32, next_allowed_ns: u64) -> BackoffState {
        BackoffState {
            failure_count,
            next_allowed_ns,
        }
    }

    #[test]
    fn it_should_return_none_for_unknown_user() {
        // Arrange
        let repo = TestRepositories::new().backoff_state();
        let user = random_principal_id();

        // Act
        let result = repo.get(&user);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_insert_and_get_state() {
        // Arrange
        let mut repo = TestRepositories::new().backoff_state();
        let user = random_principal_id();
        let state = fixture_of_state(2, 1_000_000_000_000);

        // Act
        repo.insert(&user, state.clone());
        let result = repo.get(&user);

        // Assert
        assert_eq!(result, Some(state));
    }

    #[test]
    fn it_should_remove_state() {
        // Arrange
        let mut repo = TestRepositories::new().backoff_state();
        let user = random_principal_id();
        repo.insert(&user, fixture_of_state(1, 500_000_000_000));

        // Act
        repo.remove(&user);
        let result = repo.get(&user);

        // Assert
        assert!(result.is_none());
    }
}
