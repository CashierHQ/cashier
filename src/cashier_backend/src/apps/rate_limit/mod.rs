// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::cell::RefCell;
use std::collections::BTreeSet;

use candid::Principal;
use cashier_backend_types::error::CanisterError;

use cashier_backend_types::rate_limit::{RateLimitConfig, UserRateLimitState};

use crate::repositories::{
    Repositories, rate_limit_config::RateLimitConfigRepository,
    rate_limit_state::RateLimitStateRepository,
};

thread_local! {
    /// Tracks principals with an in-flight `open_gate` request.
    /// Released via Drop even when the inter-canister callback traps.
    static RATE_LIMIT_IN_FLIGHT: RefCell<BTreeSet<Principal>> =
        const { RefCell::new(BTreeSet::new()) };
}

/// RAII guard that prevents concurrent `open_gate` calls per user and
/// enforces the sliding-window rate limit.
///
/// Acquiring the guard atomically checks both the in-flight lock and the
/// sliding-window counter. The in-flight lock is released in `Drop`, which
/// the IC CDK invokes even when a callback traps (`ic0.call_on_cleanup`).
pub struct RateLimitGuard {
    user: Principal,
}

impl RateLimitGuard {
    /// Check rate limit and acquire the in-flight lock for `user`.
    /// # Arguments
    /// * `service` - the RateLimitService to use for checking and recording the request
    /// * `user` - the user for whom to acquire the guard
    /// * `now_ns` - the current IC timestamp in nanoseconds for rate limit calculations
    /// # Returns
    /// * `Ok(RateLimitGuard)` if the guard was successfully acquired,
    /// * `Err(CanisterError::RateLimited)` if the user is already in-flight or exceeds the rate limit
    pub fn new(
        service: &mut RateLimitService<impl Repositories>,
        user: Principal,
        now_ns: u64,
    ) -> Result<Self, CanisterError> {
        let already_in_flight = RATE_LIMIT_IN_FLIGHT.with(|s| s.borrow().contains(&user));
        if already_in_flight {
            return Err(CanisterError::RateLimited(
                "Request already in progress for this user.".to_string(),
            ));
        }
        service.check_and_record(user, now_ns)?;
        RATE_LIMIT_IN_FLIGHT.with(|s| {
            s.borrow_mut().insert(user);
        });
        Ok(Self { user })
    }
}

impl Drop for RateLimitGuard {
    fn drop(&mut self) {
        RATE_LIMIT_IN_FLIGHT.with(|s| {
            s.borrow_mut().remove(&self.user);
        });
    }
}

/// Per-user sliding window rate limiter for the gate API.
pub struct RateLimitService<R: Repositories> {
    config_repo: RateLimitConfigRepository<R::RateLimitConfig>,
    state_repo: RateLimitStateRepository<R::RateLimitState>,
}

impl<R: Repositories> RateLimitService<R> {
    /// Create a new RateLimitService.
    pub fn new(repositories: &R) -> Self {
        Self {
            config_repo: repositories.rate_limit_config(),
            state_repo: repositories.rate_limit_state(),
        }
    }

    /// Check whether `user` is within their rate limit and record the request if so.
    ///
    /// Uses a sliding window counter: the estimate blends the previous window's count
    /// (weighted by how much of it still overlaps the current moment) with the current
    /// window's count, giving a smooth rate without boundary exploits.
    ///
    /// # Arguments
    /// * `user` - the user for whom to check the rate limit
    /// * `now_ns` - the current IC timestamp in nanoseconds for rate limit calculations
    /// # Returns
    /// * `Ok(())` if the request is within the rate limit and has been recorded
    /// * `Err(CanisterError::RateLimited)` if the request exceeds the rate limit (state is NOT updated in this case)
    pub fn check_and_record(&mut self, user: Principal, now_ns: u64) -> Result<(), CanisterError> {
        let config = self.config_repo.read(Clone::clone);
        if !config.enabled {
            return Ok(());
        }

        let window_ns = config.window_secs.saturating_mul(1_000_000_000);
        let state = self.state_repo.get(&user).unwrap_or_default();

        let (prev_count, current_count, window_start) =
            if window_ns == 0 || now_ns >= state.window_start_ns.saturating_add(window_ns) {
                // Entered a new window. For adjacent windows, align the new window_start to the
                // boundary of the previous window so elapsed_frac reflects actual time decay.
                // For non-adjacent windows (large gap), reset window_start to now.
                let adjacent =
                    window_ns > 0 && now_ns < state.window_start_ns.saturating_add(2 * window_ns);
                let (new_prev, new_window_start) = if adjacent {
                    (state.current_count, state.window_start_ns + window_ns)
                } else {
                    (0, now_ns)
                };
                (new_prev, 0u32, new_window_start)
            } else {
                (state.prev_count, state.current_count, state.window_start_ns)
            };

        let elapsed_frac = if window_ns > 0 {
            (now_ns - window_start) as f64 / window_ns as f64
        } else {
            1.0
        };
        let estimated = prev_count as f64 * (1.0 - elapsed_frac) + current_count as f64;

        if estimated >= config.max_requests as f64 {
            return Err(CanisterError::RateLimited(
                "Too many requests. Please wait before retrying.".to_string(),
            ));
        }

        self.state_repo.insert(
            &user,
            UserRateLimitState {
                window_start_ns: window_start,
                current_count: current_count + 1,
                prev_count,
            },
        );
        Ok(())
    }

    /// Return the current rate limit configuration.
    pub fn get_config(&self) -> RateLimitConfig {
        self.config_repo.read(Clone::clone)
    }

    /// Replace the rate limit configuration. Takes effect on the next request.
    /// # Arguments
    /// * `config` - the new rate limit configuration to set
    pub fn update_config(&mut self, config: RateLimitConfig) {
        self.config_repo.update(|cfg| *cfg = config);
    }

    /// Clear the rate limit state for a specific user (admin utility).
    /// # Arguments
    /// * `user` - the user for whom to clear the rate limit state
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

    fn make_service(repo: &TestRepositories) -> RateLimitService<TestRepositories> {
        RateLimitService::new(repo)
    }

    fn fixture_of_config(enabled: bool, max_requests: u32, window_secs: u64) -> RateLimitConfig {
        RateLimitConfig {
            enabled,
            max_requests,
            window_secs,
        }
    }

    /// Clear the in-flight set before each guard test to ensure isolation.
    fn reset_in_flight() {
        RATE_LIMIT_IN_FLIGHT.with(|s| s.borrow_mut().clear());
    }

    #[test]
    fn it_should_prevent_concurrent_requests_for_same_user() {
        // Arrange
        reset_in_flight();
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        // Allow up to 10 requests so the sliding window isn't the constraint.
        svc.update_config(fixture_of_config(true, 10, 60));
        let user = random_principal_id();

        let _guard = RateLimitGuard::new(&mut svc, user, MINUTE_NS).unwrap();

        // Act — second concurrent request for the same user
        let result = RateLimitGuard::new(&mut svc, user, MINUTE_NS + 1);

        // Assert
        assert!(matches!(result, Err(CanisterError::RateLimited(_))));
    }

    #[test]
    fn it_should_allow_concurrent_requests_for_different_users() {
        // Arrange
        reset_in_flight();
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        svc.update_config(fixture_of_config(true, 10, 60));
        let user_a = random_principal_id();
        let user_b = random_principal_id();

        // Act
        let guard_a = RateLimitGuard::new(&mut svc, user_a, MINUTE_NS);
        let guard_b = RateLimitGuard::new(&mut svc, user_b, MINUTE_NS);

        // Assert
        assert!(guard_a.is_ok());
        assert!(guard_b.is_ok());
    }

    #[test]
    fn it_should_release_lock_on_drop() {
        // Arrange
        reset_in_flight();
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        svc.update_config(fixture_of_config(true, 10, 60));
        let user = random_principal_id();

        {
            let _guard = RateLimitGuard::new(&mut svc, user, MINUTE_NS).unwrap();
            // guard is in-flight here
        } // guard dropped here

        // Act — new guard after drop
        let result = RateLimitGuard::new(&mut svc, user, MINUTE_NS + 1);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_reject_when_rate_limit_exceeded() {
        // Arrange — default config: 1 req / 60s
        reset_in_flight();
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();

        // Exhaust the sliding window via the service directly (no guard needed)
        svc.check_and_record(user, MINUTE_NS).unwrap();

        // Act — guard creation should fail due to sliding window
        let result = RateLimitGuard::new(&mut svc, user, MINUTE_NS + 1);

        // Assert
        assert!(matches!(result, Err(CanisterError::RateLimited(_))));
    }

    #[test]
    fn it_should_allow_first_request() {
        // Arrange
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();

        // Act
        let result = svc.check_and_record(user, MINUTE_NS);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_fail_second_request_due_to_limit_exceeded() {
        // Arrange — default config: 1 req / 60s
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let now = MINUTE_NS;

        svc.check_and_record(user, now).unwrap();

        // Act — second request in the same window
        let result = svc.check_and_record(user, now + 1);

        // Assert
        assert!(matches!(result, Err(CanisterError::RateLimited(_))));
    }

    #[test]
    fn it_should_allow_request_after_window_rolls_over() {
        // Arrange — exhaust the first window
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let t0 = MINUTE_NS;

        svc.check_and_record(user, t0).unwrap();
        assert!(svc.check_and_record(user, t0 + 1).is_err());

        // Act — advance past two full windows so prev_count decays to 0
        let t2 = t0 + 2 * MINUTE_NS + 1;
        let result = svc.check_and_record(user, t2);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_carry_forward_prev_count_on_new_window() {
        // Arrange — config: 3 req / 60s
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        svc.update_config(fixture_of_config(true, 3, 60));
        let user = random_principal_id();
        let t0: u64 = 0;

        // Fill current window completely (3 requests)
        svc.check_and_record(user, t0).unwrap();
        svc.check_and_record(user, t0 + 1).unwrap();
        svc.check_and_record(user, t0 + 2).unwrap();

        // Act — move to a new window at the 50% mark; prev carries 3, so estimated = 3*0.5 + 0 = 1.5
        let t1 = MINUTE_NS + MINUTE_NS / 2; // 90s in
        let result = svc.check_and_record(user, t1);

        // Assert — 1.5 < 3, so allowed
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_allow_request_when_rate_limit_disabled() {
        // Arrange
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        svc.update_config(fixture_of_config(false, 1, 60));
        let user = random_principal_id();
        let now = MINUTE_NS;

        // Act — fire multiple requests; all should pass when disabled
        svc.check_and_record(user, now).unwrap();
        svc.check_and_record(user, now + 1).unwrap();
        let result = svc.check_and_record(user, now + 2);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_allow_requests_after_config_updated_to_higher_limit() {
        // Arrange — exhaust the default limit of 1
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let now = MINUTE_NS;

        svc.check_and_record(user, now).unwrap();
        assert!(svc.check_and_record(user, now + 1).is_err());

        // Raise limit to 5 and reset user state so window starts fresh
        svc.update_config(fixture_of_config(true, 5, 60));
        svc.reset_user(&user);

        // Act — 5 requests should now succeed
        for i in 0..5u64 {
            assert!(svc.check_and_record(user, now + 2 + i).is_ok());
        }

        // Assert — 6th request exceeds new limit
        let result = svc.check_and_record(user, now + 7);
        assert!(matches!(result, Err(CanisterError::RateLimited(_))));
    }

    #[test]
    fn it_should_allow_request_after_admin_resets_user() {
        // Arrange — exhaust limit
        let repo = TestRepositories::new();
        let mut svc = make_service(&repo);
        let user = random_principal_id();
        let now = MINUTE_NS;

        svc.check_and_record(user, now).unwrap();
        assert!(svc.check_and_record(user, now + 1).is_err());

        // Act — admin resets user
        svc.reset_user(&user);
        let result = svc.check_and_record(user, now + 2);

        // Assert
        assert!(result.is_ok());
    }
}
