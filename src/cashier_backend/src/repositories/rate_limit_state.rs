// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::BTreeMap;

use candid::Principal;
use cashier_backend_types::rate_limit::{RateLimitKey, RateLimitScope, UserRateLimitState};
use ic_mple_log::service::Storage;

pub type RateLimitStateRepositoryStorage = BTreeMap<RateLimitKey, UserRateLimitState>;

/// Repository for per-user, per-endpoint rate limit state.
pub struct RateLimitStateRepository<S: Storage<RateLimitStateRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<RateLimitStateRepositoryStorage>> RateLimitStateRepository<S> {
    /// Create a new RateLimitStateRepository.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Get the current rate limit state for a user on a given endpoint.
    /// # Arguments
    /// * `user` - the user for whom to get the rate limit state
    /// * `scope` - the endpoint the state belongs to
    /// # Returns
    /// * `Some(UserRateLimitState)` if the user has state for that scope, `None` otherwise
    pub fn get(&self, user: &Principal, scope: RateLimitScope) -> Option<UserRateLimitState> {
        let key = RateLimitKey { user: *user, scope };
        self.storage.with_borrow(|store| store.get(&key).cloned())
    }

    /// Insert or overwrite the rate limit state for a user on a given endpoint.
    /// # Arguments
    /// * `user` - the user for whom to insert or overwrite the rate limit state
    /// * `scope` - the endpoint the state belongs to
    /// * `state` - the rate limit state to insert or overwrite
    pub fn insert(&mut self, user: &Principal, scope: RateLimitScope, state: UserRateLimitState) {
        let key = RateLimitKey { user: *user, scope };
        self.storage
            .with_borrow_mut(|store| store.insert(key, state));
    }

    /// Remove the rate limit state for a user across every endpoint.
    /// # Arguments
    /// * `user` - the user for whom to remove all rate limit state
    pub fn remove_all(&mut self, user: &Principal) {
        self.storage
            .with_borrow_mut(|store| store.retain(|k, _| k.user != *user));
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
        let result = repo.get(&user, RateLimitScope::GateOpen);

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
        repo.insert(&user, RateLimitScope::GateOpen, state.clone());
        let result = repo.get(&user, RateLimitScope::GateOpen);

        // Assert
        assert_eq!(result, Some(state));
    }

    #[test]
    fn it_should_isolate_state_per_scope_for_same_user() {
        // Arrange
        let mut repo = TestRepositories::new().rate_limit_state();
        let user = random_principal_id();
        let gate_state = fixture_of_state(1_000_000_000, 1, 0);

        // Act — only write GateOpen state for this user
        repo.insert(&user, RateLimitScope::GateOpen, gate_state.clone());

        // Assert — SendOtp state is untouched, GateOpen state is unaffected by the other scope
        assert_eq!(repo.get(&user, RateLimitScope::GateOpen), Some(gate_state));
        assert_eq!(repo.get(&user, RateLimitScope::SendOtp), None);
    }

    #[test]
    fn it_should_remove_state_for_all_scopes() {
        // Arrange
        let mut repo = TestRepositories::new().rate_limit_state();
        let user = random_principal_id();
        repo.insert(
            &user,
            RateLimitScope::GateOpen,
            fixture_of_state(1_000_000_000, 1, 0),
        );
        repo.insert(
            &user,
            RateLimitScope::SendOtp,
            fixture_of_state(1_000_000_000, 1, 0),
        );

        // Act
        repo.remove_all(&user);

        // Assert
        assert!(repo.get(&user, RateLimitScope::GateOpen).is_none());
        assert!(repo.get(&user, RateLimitScope::SendOtp).is_none());
    }

    #[test]
    fn it_should_not_remove_other_users_state() {
        // Arrange
        let mut repo = TestRepositories::new().rate_limit_state();
        let user_a = random_principal_id();
        let user_b = random_principal_id();
        repo.insert(
            &user_a,
            RateLimitScope::GateOpen,
            fixture_of_state(1_000_000_000, 1, 0),
        );
        repo.insert(
            &user_b,
            RateLimitScope::GateOpen,
            fixture_of_state(1_000_000_000, 1, 0),
        );

        // Act
        repo.remove_all(&user_a);

        // Assert
        assert!(repo.get(&user_a, RateLimitScope::GateOpen).is_none());
        assert!(repo.get(&user_b, RateLimitScope::GateOpen).is_some());
    }
}
