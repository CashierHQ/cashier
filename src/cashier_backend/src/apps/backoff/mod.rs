// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    backoff::{BackoffConfig, BackoffState},
    error::CanisterError,
};

use crate::repositories::{
    BACKOFF_STATE_STORE, Repositories, backoff_config::BackoffConfigRepository,
    backoff_state::BackoffStateRepository,
};

/// RAII guard that ensures an exponential-backoff penalty is recorded for
/// every gate attempt, including when the inter-canister callback traps.
///
/// Create the guard before the inter-canister call. Call `mark_attempted()`
/// immediately before the gate call so that only real gate attempts (not
/// calls rejected earlier by the rate limiter) incur a backoff penalty.
/// Call `on_success()` if the gate call succeeds; otherwise `Drop` records
/// a failure and advances the backoff window.
pub struct BackoffGuard {
    user: Principal,
    /// IC timestamp at guard creation, used to compute `next_allowed_ns`.
    now_ns: u64,
    base_wait_secs: u64,
    enabled: bool,
    /// Set to `true` just before the inter-canister gate call. `Drop` only
    /// records a failure/success when this is `true`, so calls that are
    /// rejected by the rate limiter before reaching the gate do not incur
    /// a spurious backoff penalty.
    attempted: bool,
    succeeded: bool,
}

impl BackoffGuard {
    /// Check the backoff window and, if clear, create a guard.
    /// # Arguments
    /// * `service` - the BackoffService to use for checking the backoff window
    /// * `user` - the user for whom to create the guard
    /// * `now_ns` - the current IC timestamp in nanoseconds for backoff calculations
    /// # Returns
    /// * `Ok(BackoffGuard)` if the user is allowed to proceed and the guard was successfully created
    /// * `Err(CanisterError::BackoffThrottled)` if the user is still within a backoff window and should be throttled
    pub fn new(
        service: &BackoffService<impl Repositories>,
        user: Principal,
        now_ns: u64,
    ) -> Result<Self, CanisterError> {
        service.check(user, now_ns)?;
        let config = service.get_config();
        Ok(Self {
            user,
            now_ns,
            base_wait_secs: config.base_wait_secs,
            enabled: config.enabled,
            attempted: false,
            succeeded: false,
        })
    }

    /// Signal that the actual inter-canister gate call is about to be made.
    ///
    /// Must be called after all pre-call guards (e.g. rate limiter) have
    /// passed. `Drop` only records a backoff outcome when `attempted` is
    /// `true`, so calls rejected before reaching the gate incur no penalty.
    pub fn mark_attempted(&mut self) {
        self.attempted = true;
    }

    /// Mark the gate call as successful; `Drop` will clear the backoff state
    /// instead of recording a failure.
    pub fn on_success(&mut self) {
        self.succeeded = true;
    }
}

impl Drop for BackoffGuard {
    fn drop(&mut self) {
        if !self.enabled || !self.attempted {
            return;
        }
        BACKOFF_STATE_STORE.with(|store| {
            let mut borrow = store.borrow_mut();
            if self.succeeded {
                borrow.remove(&self.user);
            } else {
                let state = borrow.entry(self.user).or_default();
                let new_count = state.failure_count.saturating_add(1);
                let exponent = (new_count - 1).min(30);
                let wait_ns = self
                    .base_wait_secs
                    .saturating_mul(1u64 << exponent)
                    .saturating_mul(1_000_000_000);
                *state = BackoffState {
                    failure_count: new_count,
                    next_allowed_ns: self.now_ns.saturating_add(wait_ns),
                };
            }
        });
    }
}

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
    /// # Arguments
    /// * `user` - the user to check
    /// * `now_ns` - current IC timestamp in nanoseconds, used to check against `next_allowed_ns`
    /// # Returns
    /// * `Ok(())` if the user is allowed to proceed with the gate call
    /// * `Err(CanisterError::BackoffThrottled)` if the user is still within a backoff window and should be throttled
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
    /// Only compiled in test mode — production code uses `BackoffGuard::drop()`
    /// which writes directly to the thread-local, ensuring the penalty is applied
    /// even when an inter-canister callback traps.
    /// # Arguments
    /// * `user` - the user for whom to record the failure
    /// * `now_ns` - current IC timestamp in nanoseconds, used to compute `next_allowed_ns`
    #[cfg(test)]
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
    ///
    /// Only compiled in test mode — production code uses `BackoffGuard::drop()`.
    /// # Arguments
    /// * `user` - the user for whom to record the success
    #[cfg(test)]
    pub fn record_success(&mut self, user: &Principal) {
        self.state_repo.remove(user);
    }

    /// Return the current backoff configuration.
    pub fn get_config(&self) -> BackoffConfig {
        self.config_repo.read(Clone::clone)
    }

    /// Replace the backoff configuration. Takes effect on the next request.
    /// # Arguments
    /// * `config` - the new backoff configuration to apply
    pub fn update_config(&mut self, config: BackoffConfig) {
        self.config_repo.update(|cfg| *cfg = config);
    }

    /// Clear the backoff state for a specific user (admin utility).
    /// # Arguments
    /// * `user` - the user for whom to clear the backoff state
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

    // ── BackoffGuard tests ────────────────────────────────────────────────

    /// Clear the BACKOFF_STATE_STORE thread-local before each guard test.
    fn reset_backoff_store() {
        BACKOFF_STATE_STORE.with(|s| s.borrow_mut().clear());
    }

    fn read_backoff_state(user: &Principal) -> Option<BackoffState> {
        BACKOFF_STATE_STORE.with(|s| s.borrow().get(user).cloned())
    }

    #[test]
    fn it_should_record_failure_on_drop() {
        // Arrange
        reset_backoff_store();
        let repo = TestRepositories::new();
        let svc = make_service(&repo);
        let user = random_principal_id();

        // Act — mark_attempted then drop without calling on_success
        {
            let mut guard = BackoffGuard::new(&svc, user, 0).unwrap();
            guard.mark_attempted();
        }

        // Assert — failure recorded in the real thread-local
        let state = read_backoff_state(&user).expect("state should exist");
        assert_eq!(state.failure_count, 1);
        assert_eq!(state.next_allowed_ns, 180 * 1_000_000_000);
    }

    #[test]
    fn it_should_not_record_failure_when_not_attempted() {
        // Arrange — guard dropped without mark_attempted (e.g. rate limiter blocked)
        reset_backoff_store();
        let repo = TestRepositories::new();
        let svc = make_service(&repo);
        let user = random_principal_id();

        // Act — drop without mark_attempted
        {
            let _guard = BackoffGuard::new(&svc, user, 0).unwrap();
        }

        // Assert — no state written
        assert!(read_backoff_state(&user).is_none());
    }

    #[test]
    fn it_should_record_success_on_drop_after_on_success() {
        // Arrange — pre-seed one failure so there is existing state to clear
        reset_backoff_store();
        BACKOFF_STATE_STORE.with(|s| {
            s.borrow_mut().insert(
                Principal::anonymous(),
                BackoffState {
                    failure_count: 1,
                    next_allowed_ns: 0,
                },
            );
        });
        let repo = TestRepositories::new();
        let svc = make_service(&repo);
        let user = random_principal_id();
        // Seed state for this specific user
        BACKOFF_STATE_STORE.with(|s| {
            s.borrow_mut().insert(
                user,
                BackoffState {
                    failure_count: 2,
                    next_allowed_ns: 0,
                },
            );
        });

        // Act — mark_attempted then drop after on_success
        {
            let mut guard = BackoffGuard::new(&svc, user, 0).unwrap();
            guard.mark_attempted();
            guard.on_success();
        }

        // Assert — state removed (same as record_success)
        assert!(read_backoff_state(&user).is_none());
    }

    #[test]
    fn it_should_not_mutate_state_when_disabled() {
        // Arrange
        reset_backoff_store();
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        svc.update_config(fixture_of_config(false, 180));
        let user = random_principal_id();

        // Act — drop without on_success; backoff is disabled
        {
            let _guard = BackoffGuard::new(&svc, user, 0).unwrap();
        }

        // Assert — no state written
        assert!(read_backoff_state(&user).is_none());
    }

    #[test]
    fn it_should_double_wait_on_each_failure_via_guard() {
        // Arrange
        reset_backoff_store();
        let repo = TestRepositories::new();
        let svc = make_service(&repo);
        let user = random_principal_id();
        let t0 = 0u64;

        // Failure 1: wait = 180s
        {
            let mut g = BackoffGuard::new(&svc, user, t0).unwrap();
            g.mark_attempted();
        }
        let s1 = read_backoff_state(&user).unwrap();
        assert_eq!(s1.failure_count, 1);
        assert_eq!(s1.next_allowed_ns, 180 * 1_000_000_000);

        // Failure 2: wait = 360s
        {
            let mut g = BackoffGuard::new(&svc, user, t0).unwrap();
            g.mark_attempted();
        }
        let s2 = read_backoff_state(&user).unwrap();
        assert_eq!(s2.failure_count, 2);
        assert_eq!(s2.next_allowed_ns, 360 * 1_000_000_000);

        // Failure 3: wait = 720s
        {
            let mut g = BackoffGuard::new(&svc, user, t0).unwrap();
            g.mark_attempted();
        }
        let s3 = read_backoff_state(&user).unwrap();
        assert_eq!(s3.failure_count, 3);
        assert_eq!(s3.next_allowed_ns, 720 * 1_000_000_000);
    }
}
