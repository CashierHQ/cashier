// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::BTreeMap;

use candid::Principal;
use ic_mple_log::service::Storage;

/// Per-user sliding window counter state. Stored on the heap — resets on canister upgrade.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct UserRateLimitState {
    /// IC timestamp (nanoseconds) when the current window opened.
    pub window_start_ns: u64,
    /// Number of requests recorded in the current window.
    pub current_count: u32,
    /// Number of requests recorded in the previous (fully elapsed) window.
    pub prev_count: u32,
}

pub type RateLimitStateRepositoryStorage = BTreeMap<Principal, UserRateLimitState>;

/// Repository for per-user rate limit state.
pub struct RateLimitStateRepository<S: Storage<RateLimitStateRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<RateLimitStateRepositoryStorage>> RateLimitStateRepository<S> {
    /// Create a new RateLimitStateRepository.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Get the current rate limit state for a user.
    pub fn get(&self, user: &Principal) -> Option<UserRateLimitState> {
        self.storage.with_borrow(|store| store.get(user).cloned())
    }

    /// Insert or overwrite the rate limit state for a user.
    pub fn insert(&mut self, user: &Principal, state: UserRateLimitState) {
        self.storage
            .with_borrow_mut(|store| store.insert(*user, state));
    }

    /// Remove the rate limit state for a user.
    pub fn remove(&mut self, user: &Principal) {
        self.storage.with_borrow_mut(|store| store.remove(user));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::random_principal_id;

    fn fixture_of_state(
        window_start_ns: u64,
        current_count: u32,
        prev_count: u32,
    ) -> UserRateLimitState {
        UserRateLimitState {
            window_start_ns,
            current_count,
            prev_count,
        }
    }

    #[test]
    fn it_should_return_none_for_unknown_user() {
        // Arrange
        let repo = TestRepositories::new().rate_limit_state();
        let user = random_principal_id();

        // Act
        let result = repo.get(&user);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_insert_and_get_state() {
        // Arrange
        let mut repo = TestRepositories::new().rate_limit_state();
        let user = random_principal_id();
        let state = fixture_of_state(1_000_000_000, 3, 2);

        // Act
        repo.insert(&user, state.clone());
        let result = repo.get(&user);

        // Assert
        assert_eq!(result, Some(state));
    }

    #[test]
    fn it_should_remove_state() {
        // Arrange
        let mut repo = TestRepositories::new().rate_limit_state();
        let user = random_principal_id();
        repo.insert(&user, fixture_of_state(1_000_000_000, 1, 0));

        // Act
        repo.remove(&user);
        let result = repo.get(&user);

        // Assert
        assert!(result.is_none());
    }
}
