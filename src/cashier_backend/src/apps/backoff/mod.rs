// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{backoff::BackoffConfig, error::CanisterError};

use crate::repositories::{
    Repositories,
    backoff_config::BackoffConfigRepository,
    backoff_state::{BackoffState, BackoffStateRepository},
};

/// Per-user exponential backoff throttler for the gate API.
///
/// After each consecutive failed attempt the user must wait
/// `base_wait_secs * 2^(failure_count - 1)` seconds before retrying.
/// A successful attempt resets the counter to zero.
pub struct BackoffService<R: Repositories> {
    config_repo: BackoffConfigRepository<R::BackoffConfig>,
    state_repo: BackoffStateRepository<R::BackoffState>,
}

impl<R: Repositories> BackoffService<R> {
    /// Create a new BackoffService.
    pub fn new(repositories: &R) -> Self {
        Self {
            config_repo: repositories.backoff_config(),
            state_repo: repositories.backoff_state(),
        }
    }

    /// Check whether `user` is within an active backoff penalty window.
    ///
    /// This is a read-only check — state is not mutated here. Call before
    /// the inter-canister gate call (and before the rate limiter).
    pub fn check(&self, user: Principal, now_ns: u64) -> Result<(), CanisterError> {
        let config = self.config_repo.read(Clone::clone);
        if !config.enabled {
            return Ok(());
        }

        let state = self.state_repo.get(&user).unwrap_or_default();
        if state.failure_count == 0 {
            return Ok(());
        }

        if now_ns < state.next_allowed_ns {
            let remaining_secs = (state.next_allowed_ns - now_ns) / 1_000_000_000;
            return Err(CanisterError::BackoffThrottled(format!(
                "Too many failed attempts. Try again in {remaining_secs}s."
            )));
        }
        Ok(())
    }

    /// Record a failed gate attempt for `user`.
    ///
    /// Increments the failure counter and sets `next_allowed_ns` to
    /// `now_ns + base_wait_secs * 2^(failure_count - 1)`.
    /// The exponent is capped at 30 to prevent u64 overflow.
    pub fn record_failure(&mut self, user: Principal, now_ns: u64) {
        let config = self.config_repo.read(Clone::clone);
        if !config.enabled {
            return;
        }

        let state = self.state_repo.get(&user).unwrap_or_default();
        let new_failure_count = state.failure_count.saturating_add(1);
        let exponent = (new_failure_count - 1).min(30);
        let wait_ns = config
            .base_wait_secs
            .saturating_mul(1u64 << exponent)
            .saturating_mul(1_000_000_000);

        self.state_repo.insert(
            &user,
            BackoffState {
                failure_count: new_failure_count,
                next_allowed_ns: now_ns.saturating_add(wait_ns),
            },
        );
    }

    /// Record a successful gate attempt for `user`, resetting the failure counter.
    pub fn record_success(&mut self, user: &Principal) {
        self.state_repo.remove(user);
    }

    /// Return the current backoff configuration.
    pub fn get_config(&self) -> BackoffConfig {
        self.config_repo.read(Clone::clone)
    }

    /// Replace the backoff configuration. Takes effect on the next request.
    pub fn update_config(&mut self, config: BackoffConfig) {
        self.config_repo.update(|cfg| *cfg = config);
    }

    /// Clear the backoff state for a specific user (admin utility).
    pub fn reset_user(&mut self, user: &Principal) {
        self.state_repo.remove(user);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use cashier_common::test_utils::random_principal_id;

    const MINUTE_NS: u64 = 60_000_000_000;
    const BASE_WAIT_NS: u64 = 180 * 1_000_000_000; // 3 min in ns

    fn make_service(repo: &TestRepositories) -> BackoffService<TestRepositories> {
        BackoffService::new(repo)
    }

    fn fixture_of_config(enabled: bool, base_wait_secs: u64) -> BackoffConfig {
        BackoffConfig {
            enabled,
            base_wait_secs,
        }
    }

    #[test]
    fn it_should_allow_first_attempt() {
        // Arrange — no prior state
        let repo = TestRepositories::new();
        let svc = make_service(&repo);
        let user = random_principal_id();

        // Act
        let result = svc.check(user, MINUTE_NS);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_allow_attempt_with_no_failures() {
        // Arrange — state exists but failure_count is 0 (edge case via default)
        let repo = TestRepositories::new();
        let svc = make_service(&repo);
        let user = random_principal_id();
        // No state inserted → default has failure_count=0

        // Act
        let result = svc.check(user, MINUTE_NS);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_fail_check_during_backoff_window() {
        // Arrange — one failure recorded
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let t0 = MINUTE_NS;

        svc.record_failure(user, t0);

        // Act — immediate retry (still within 3-min window)
        let result = svc.check(user, t0 + 1);

        // Assert
        assert!(matches!(result, Err(CanisterError::BackoffThrottled(_))));
    }

    #[test]
    fn it_should_allow_attempt_after_backoff_expires() {
        // Arrange — one failure, then wait past next_allowed_ns
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let t0 = 0u64;

        svc.record_failure(user, t0);
        // next_allowed = t0 + 3min = BASE_WAIT_NS

        // Act — attempt exactly at expiry
        let result = svc.check(user, BASE_WAIT_NS);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_double_wait_on_each_failure() {
        // Arrange — verify 3min → 6min → 12min progression
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let t0 = 0u64;

        // Failure 1: wait = 180s
        svc.record_failure(user, t0);
        let state1 = repo.backoff_state().get(&user).unwrap();
        assert_eq!(state1.failure_count, 1);
        assert_eq!(state1.next_allowed_ns, 180 * 1_000_000_000);

        // Failure 2: wait = 360s
        svc.record_failure(user, t0);
        let state2 = repo.backoff_state().get(&user).unwrap();
        assert_eq!(state2.failure_count, 2);
        assert_eq!(state2.next_allowed_ns, 360 * 1_000_000_000);

        // Failure 3: wait = 720s
        svc.record_failure(user, t0);
        let state3 = repo.backoff_state().get(&user).unwrap();
        assert_eq!(state3.failure_count, 3);
        assert_eq!(state3.next_allowed_ns, 720 * 1_000_000_000);
    }

    #[test]
    fn it_should_allow_attempt_when_disabled() {
        // Arrange — backoff disabled, failure state present
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        svc.update_config(fixture_of_config(false, 180));
        let user = random_principal_id();
        let t0 = MINUTE_NS;

        svc.record_failure(user, t0); // record_failure also respects enabled flag

        // Act — check should pass regardless
        let result = svc.check(user, t0 + 1);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_reset_state_on_success() {
        // Arrange — one failure recorded
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let t0 = MINUTE_NS;

        svc.record_failure(user, t0);
        assert!(svc.check(user, t0 + 1).is_err());

        // Act — record success
        svc.record_success(&user);

        // Assert — check now passes
        assert!(svc.check(user, t0 + 2).is_ok());
        assert!(repo.backoff_state().get(&user).is_none());
    }

    #[test]
    fn it_should_allow_attempt_after_admin_reset() {
        // Arrange — failure recorded, admin resets
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let t0 = MINUTE_NS;

        svc.record_failure(user, t0);
        assert!(svc.check(user, t0 + 1).is_err());

        // Act — admin reset
        svc.reset_user(&user);

        // Assert
        assert!(svc.check(user, t0 + 2).is_ok());
    }
}
