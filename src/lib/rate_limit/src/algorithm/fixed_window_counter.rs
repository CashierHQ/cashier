use std::cell::RefCell;

use crate::algorithm::types::{RateLimitError, RateLimitResult};

/// Core implementation of the fixed window counter rate limiting algorithm.
///
/// The fixed window counter algorithm divides time into fixed-size windows and counts
/// requests within each window. When a window boundary is crossed, the counter resets
/// to zero. This provides simple and predictable rate limiting but can allow bursts
/// at window boundaries.
///
/// # Algorithm Behavior
///
/// - Time is divided into fixed windows of `window_duration_tick` duration
/// - Each window has independent capacity tracking
/// - Counters reset to zero at the start of each new window
/// - Requests are accepted if they don't exceed the window's remaining capacity
///
/// # Window Boundaries
///
/// Windows are aligned to multiples of `window_duration_tick`:
/// - Window 0: [0, window_duration_tick-1]
/// - Window 1: [window_duration_tick, 2*window_duration_tick-1]
/// - Window 2: [2*window_duration_tick, 3*window_duration_tick-1]
/// - And so on...
/// ```
pub struct FixedWindowCounterCore {
    /// Maximum number of tokens allowed per window
    capacity: u64,
    /// Duration of each window
    window_duration: u64,
    /// Internal state protected by RefCell for single-threaded access
    state: RefCell<FixedWindowCounterCoreState>,
}

/// Internal state of the fixed window counter
struct FixedWindowCounterCoreState {
    /// Current count of tokens used in the active window
    count: u64,
    /// Tick when the current window started
    start_tick: u64,
}

impl FixedWindowCounterCore {
    /// Creates a new fixed window counter with the specified parameters.
    ///
    /// # Parameters
    ///
    /// * `capacity` - Maximum number of tokens allowed per window
    /// * `window_duration` - Duration of each window
    ///
    /// # Panics
    ///
    /// Panics if any parameter is zero, as this would create an invalid configuration.
    ///
    /// # Example
    ///
    /// ```rust
    /// use rate_guard_core::cores::FixedWindowCounterCore;
    /// let counter = FixedWindowCounterCore::new(50, 60); // 50 requests per 60 ticks
    /// ```
    pub fn new(capacity: u64, window_duration: u64) -> Self {
        assert!(capacity > 0, "capacity must be greater than 0");
        assert!(
            window_duration > 0,
            "window_duration must be greater than 0"
        );

        FixedWindowCounterCore {
            capacity,
            window_duration,
            state: RefCell::new(FixedWindowCounterCoreState {
                count: 0,
                start_tick: 0, // First window starts at tick 0
            }),
        }
    }

    /// Attempts to acquire tokens at the given tick with detailed diagnostics.
    ///
    /// Returns detailed error information that includes additional context, such as
    /// current available tokens, required wait time, and more. This is useful for async backoff,
    /// logging, or advanced handling.
    ///
    /// # Arguments
    /// * `current_tick` – The current tick
    /// * `tokens` – Number of tokens to acquire
    ///
    /// # Returns
    /// * `Ok(())` – If the tokens were successfully acquired
    /// * `Err(RateLimitError::ExpiredTick)` – Provided tick is older than current window
    /// * `Err(RateLimitError::BeyondCapacity)` – Requested tokens exceed the configured capacity
    /// * `Err(RateLimitError::InsufficientCapacity)` – Not enough tokens available in current window
    #[inline(always)]
    pub fn try_acquire_at(&self, current_tick: u64, tokens: u64) -> RateLimitResult {
        if tokens == 0 {
            return Ok(());
        }

        let mut state = self.state.borrow_mut();

        // Calculate which window the current tick belongs to
        let current_window = current_tick / self.window_duration;
        let state_window = state.start_tick / self.window_duration;

        // Check if we've moved to a new window
        if current_window > state_window {
            // Reset counter and update window start time
            state.count = 0;
            state.start_tick = current_window * self.window_duration;
        }

        // Prevent time from going backwards within the current window
        if current_tick < state.start_tick {
            return Err(RateLimitError::ExpiredTick {
                min_acceptable_tick: state.start_tick,
            });
        }

        if tokens > self.capacity {
            return Err(RateLimitError::BeyondCapacity {
                acquiring: tokens,
                capacity: self.capacity,
            });
        }

        if tokens <= self.capacity.saturating_sub(state.count) {
            state.count += tokens;
            Ok(())
        } else {
            let available = self.capacity.saturating_sub(state.count);
            let next_window_tick = (current_window + 1) * self.window_duration;
            let retry_after_tick = next_window_tick.saturating_sub(current_tick);

            Err(RateLimitError::InsufficientCapacity {
                acquiring: tokens,
                available,
                retry_after_ticks: retry_after_tick,
            })
        }
    }

    /// Gets the current remaining token capacity in the current window.
    ///
    /// This method updates the window state based on current ticks (resets counter
    /// if a new window has started), then returns the remaining capacity in the
    /// current window.
    ///
    /// # Parameters
    /// * `ticks` - Current ticks for window calculation
    ///
    /// # Returns
    /// * `Ok(remaining_capacity)` - Remaining tokens available in current window
    /// * `Err(RateLimitError::ExpiredTick)` - Time went backwards
    #[inline(always)]
    pub fn capacity_remaining(&self, ticks: u64) -> Result<u64, RateLimitError> {
        // Get mutable reference to state
        let mut state = self.state.borrow_mut();

        // Calculate which window the current ticks belongs to
        let current_window = ticks / self.window_duration;
        let state_window = state.start_tick / self.window_duration;

        // Check if we've moved to a new window
        if current_window > state_window {
            // Reset counter and update window start time
            state.count = 0;
            state.start_tick = current_window * self.window_duration;
        }

        // Prevent time from going backwards within the current window
        if ticks < state.start_tick {
            return Err(RateLimitError::ExpiredTick {
                min_acceptable_tick: state.start_tick,
            });
        }

        // Return remaining capacity in current window
        Ok(self.capacity.saturating_sub(state.count))
    }

    /// Returns the number of tokens that can still be acquired without exceeding capacity.
    ///
    /// # Arguments
    ///
    /// * `ticks` - Current ticks for capacity calculation.
    ///
    /// # Returns
    ///
    /// The number of tokens currently available for acquisition, or 0 if error.
    #[inline(always)]
    pub fn capacity_remaining_or_0(&self, ticks: u64) -> u64 {
        self.capacity_remaining(ticks).unwrap_or(0)
    }
}

/// Configuration structure for creating a `FixedWindowCounterCore` limiter.
#[derive(Debug, Clone)]
pub struct FixedWindowCounterCoreConfig {
    /// Maximum number of actions allowed per window.
    pub capacity: u64,
    /// Number of that define the fixed window length.
    pub window_size: u64,
}

impl FixedWindowCounterCoreConfig {
    /// Creates a new configuration instance.
    pub fn new(capacity: u64, window_size_tick: u64) -> Self {
        Self {
            capacity,
            window_size: window_size_tick,
        }
    }
}

impl From<FixedWindowCounterCoreConfig> for FixedWindowCounterCore {
    /// Converts a `FixedWindowCounterCoreConfig` into a `FixedWindowCounterCore` instance.
    ///
    /// # Panics
    /// This method will panic if either `capacity` or `window_size_tick` is zero.
    /// It is intended for use with trusted or pre-validated inputs.
    ///
    /// # Examples
    ///
    /// Using [`From::from`] explicitly:
    ///
    /// ```
    /// use rate_guard_core::cores::{FixedWindowCounterCore, FixedWindowCounterCoreConfig};
    ///
    /// let config = FixedWindowCounterCoreConfig {
    ///     capacity: 100,
    ///     window_size_tick: 60,
    /// };
    ///
    /// let limiter = FixedWindowCounterCore::from(config);
    /// ```
    ///
    /// Using `.into()` with type inference:
    ///
    /// ```
    /// use rate_guard_core::cores::{FixedWindowCounterCore, FixedWindowCounterCoreConfig};
    ///
    /// let limiter: FixedWindowCounterCore = FixedWindowCounterCoreConfig {
    ///     capacity: 100,
    ///     window_size_tick: 60,
    /// }.into();
    /// ```
    #[inline(always)]
    fn from(config: FixedWindowCounterCoreConfig) -> Self {
        FixedWindowCounterCore::new(config.capacity, config.window_size)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper function to get a tick in the past relative to a base time
    ///
    /// # Arguments
    /// * `base_time` - The reference time to subtract from
    /// * `ago` - Number to subtract from base_time
    ///
    /// # Returns
    /// Tick that is `ago` before `base_time`
    fn past(base_time: u64, ago: u64) -> u64 {
        base_time.saturating_sub(ago)
    }

    /// Helper function to get a tick at the start of the next window relative to base time
    ///
    /// # Arguments
    /// * `base_time` - The reference time to calculate from
    /// * `window_size` - The window size
    ///
    /// # Returns
    /// Tick at the start of the next window after `base_time`
    fn next_window(base_time: u64, window_size: u64) -> u64 {
        ((base_time / window_size) + 1) * window_size
    }

    /// Helper function to get a stable base time for testing
    /// This returns a predictable tick that aligns well with window boundaries
    fn stable_base_time() -> u64 {
        // Use a fixed tick that's a multiple of common window sizes (60, 100, 300)
        // This makes tests more predictable
        1_000_000_000 // January 9, 2001 01:46:40 UTC
    }
    use crate::algorithm::types::RateLimitError;

    #[test]
    #[should_panic(expected = "capacity must be greater than 0")]
    fn test_zero_capacity_panics() {
        FixedWindowCounterCore::new(0, 60);
    }

    #[test]
    #[should_panic(expected = "window_duration must be greater than 0")]
    fn test_zero_duration_panics() {
        FixedWindowCounterCore::new(10, 0);
    }

    #[test]
    fn test_try_acquire_at_zero_tokens() {
        let counter = FixedWindowCounterCore::new(10, 60);

        // Zero tokens should always succeed
        let current_time = stable_base_time();
        assert!(counter.try_acquire_at(current_time, 0).is_ok());
        assert!(counter.try_acquire_at(current_time + 100, 0).is_ok());
        assert!(counter.try_acquire_at(current_time + 1000, 0).is_ok());
    }

    #[test]
    fn test_try_acquire_at_basic_success() {
        let counter = FixedWindowCounterCore::new(10, 60);

        // Basic successful acquisition
        let current_time = stable_base_time();
        assert!(counter.try_acquire_at(current_time, 5).is_ok());
        assert!(counter.try_acquire_at(current_time + 10, 3).is_ok());
        assert!(counter.try_acquire_at(current_time + 20, 2).is_ok());
    }

    #[test]
    fn test_try_acquire_at_beyond_capacity() {
        let counter = FixedWindowCounterCore::new(10, 60);

        // Request exceeds total capacity
        let current_time = stable_base_time();
        match counter.try_acquire_at(current_time, 15) {
            Err(RateLimitError::BeyondCapacity {
                acquiring,
                capacity,
            }) => {
                assert_eq!(acquiring, 15);
                assert_eq!(capacity, 10);
            }
            _ => panic!("Expected BeyondCapacity error"),
        }

        // Exactly at capacity should succeed
        assert!(counter.try_acquire_at(current_time, 10).is_ok());
    }

    #[test]
    fn test_try_acquire_at_insufficient_capacity() {
        let counter = FixedWindowCounterCore::new(10, 60);

        // Use up most capacity
        let current_time = stable_base_time();
        assert!(counter.try_acquire_at(current_time, 8).is_ok());

        // Request would exceed remaining capacity
        match counter.try_acquire_at(current_time + 10, 3) {
            Err(RateLimitError::InsufficientCapacity {
                acquiring,
                available,
                retry_after_ticks: _,
            }) => {
                assert_eq!(acquiring, 3);
                assert_eq!(available, 2); // 10 - 8 = 2
            }
            _ => panic!("Expected InsufficientCapacity error"),
        }

        // But smaller request should succeed
        assert!(counter.try_acquire_at(current_time + 15, 2).is_ok());
    }

    #[test]
    fn test_try_acquire_at_window_transitions() {
        let counter = FixedWindowCounterCore::new(10, 60);

        // Fill up first window
        let current_time = stable_base_time();
        assert!(counter.try_acquire_at(current_time, 10).is_ok());
        match counter.try_acquire_at(current_time + 1, 1) {
            Err(RateLimitError::InsufficientCapacity { .. }) => {}
            _ => panic!("Expected InsufficientCapacity error"),
        }

        // Move to next window - should reset capacity
        let next_window_time = next_window(current_time, 60);
        assert!(counter.try_acquire_at(next_window_time, 10).is_ok());

        // Jump multiple windows ahead
        assert!(counter.try_acquire_at(next_window_time + 240, 10).is_ok());
    }

    #[test]
    fn test_try_acquire_at_expired_tick() {
        let counter = FixedWindowCounterCore::new(10, 60);

        // Establish current window
        let current_time = stable_base_time();
        assert!(counter.try_acquire_at(current_time, 5).is_ok());

        // Try to go backwards in time
        match counter.try_acquire_at(past(current_time, 300), 1) {
            Err(RateLimitError::ExpiredTick { .. }) => {}
            _ => panic!("Expected ExpiredTick error"),
        }

        // Same tick should work
        assert!(counter.try_acquire_at(current_time, 1).is_ok());
    }

    #[test]
    fn test_try_acquire_at_overflow_protection() {
        let counter = FixedWindowCounterCore::new(u64::MAX, 60);

        // Should handle requests that would overflow
        let current_time = stable_base_time();
        assert!(counter.try_acquire_at(current_time, u64::MAX).is_ok());
        match counter.try_acquire_at(current_time + 10, 1) {
            Err(RateLimitError::InsufficientCapacity { .. }) => {}
            _ => panic!("Expected InsufficientCapacity error"),
        }

        // After window transition, should reset
        let next_window_time = next_window(current_time, 60);
        assert!(counter.try_acquire_at(next_window_time, u64::MAX).is_ok());
    }

    #[test]
    fn test_capacity_remaining_fresh_counter() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let current_time = stable_base_time();

        // Fresh counter should have full capacity
        assert_eq!(counter.capacity_remaining(current_time).unwrap(), 10);

        // Multiple calls without acquiring should return same result
        assert_eq!(counter.capacity_remaining(current_time + 1).unwrap(), 10);
        assert_eq!(counter.capacity_remaining(current_time + 30).unwrap(), 10);
    }

    #[test]
    fn test_capacity_remaining_after_acquisitions() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let current_time = stable_base_time();

        // Fresh counter should have full capacity
        assert_eq!(counter.capacity_remaining(current_time).unwrap(), 10);

        // Acquire some tokens
        assert!(counter.try_acquire_at(current_time, 3).is_ok());

        // Check remaining capacity - should be 7
        let remaining = counter.capacity_remaining(current_time + 1).unwrap();
        assert_eq!(remaining, 7);

        // Acquire more tokens
        assert!(counter.try_acquire_at(current_time + 2, 4).is_ok());

        // Check remaining capacity - should be 3
        let remaining = counter.capacity_remaining(current_time + 3).unwrap();
        assert_eq!(remaining, 3);

        // Use remaining capacity
        assert!(counter.try_acquire_at(current_time + 10, 3).is_ok());

        // Check remaining capacity - should be 0
        let remaining = counter.capacity_remaining(current_time + 11).unwrap();
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_capacity_remaining_window_transitions() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let current_time = stable_base_time();

        // Use up capacity in first window
        assert!(counter.try_acquire_at(current_time, 10).is_ok());
        assert_eq!(counter.capacity_remaining(current_time + 1).unwrap(), 0);

        // Move to next window - capacity should reset
        let next_window_time = next_window(current_time, 60);
        assert_eq!(counter.capacity_remaining(next_window_time).unwrap(), 10);

        // Use some capacity in new window
        assert!(counter.try_acquire_at(next_window_time + 5, 6).is_ok());
        assert_eq!(
            counter.capacity_remaining(next_window_time + 10).unwrap(),
            4
        );

        // Jump multiple windows ahead - should reset again
        let far_future_time = next_window_time + 300; // 5 windows later
        assert_eq!(counter.capacity_remaining(far_future_time).unwrap(), 10);
    }

    #[test]
    fn test_capacity_remaining_expired_tick() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let current_time = stable_base_time();

        // Establish current window
        assert!(counter.try_acquire_at(current_time, 5).is_ok());
        assert_eq!(counter.capacity_remaining(current_time + 10).unwrap(), 5);

        // Try to check capacity with expired tick
        match counter.capacity_remaining(past(current_time, 100)) {
            Err(RateLimitError::ExpiredTick {
                min_acceptable_tick,
            }) => {
                // Should return the window start time as minimum acceptable
                let expected_window_start = (current_time / 60) * 60;
                assert_eq!(min_acceptable_tick, expected_window_start);
            }
            _ => panic!("Expected ExpiredTick error"),
        }

        // Same tick should still work
        assert_eq!(counter.capacity_remaining(current_time + 10).unwrap(), 5);
    }

    #[test]
    fn test_capacity_remaining_window_boundary_edge_cases() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let window_start = 1200; // Aligned to window boundary (1200 / 60 = 20)

        // Check capacity at exact window boundary
        assert_eq!(counter.capacity_remaining(window_start).unwrap(), 10);

        // Use some capacity
        assert!(counter.try_acquire_at(window_start + 1, 7).is_ok());
        assert_eq!(counter.capacity_remaining(window_start + 30).unwrap(), 3);

        // Check at end of window
        assert_eq!(counter.capacity_remaining(window_start + 59).unwrap(), 3);

        // Move to exact start of next window
        let next_window_start = window_start + 60;
        assert_eq!(counter.capacity_remaining(next_window_start).unwrap(), 10);
    }

    #[test]
    fn test_capacity_remaining_zero_capacity_edge_case() {
        let counter = FixedWindowCounterCore::new(5, 60);
        let current_time = stable_base_time();

        // Initial capacity should be full
        assert_eq!(counter.capacity_remaining(current_time).unwrap(), 5);

        // Use all capacity
        assert!(counter.try_acquire_at(current_time, 5).is_ok());
        assert_eq!(counter.capacity_remaining(current_time + 1).unwrap(), 0);

        // Multiple checks should consistently return 0
        assert_eq!(counter.capacity_remaining(current_time + 5).unwrap(), 0);
        assert_eq!(counter.capacity_remaining(current_time + 10).unwrap(), 0);
        assert_eq!(counter.capacity_remaining(current_time + 15).unwrap(), 0);

        // Window transition should reset to full capacity
        let next_window_time = next_window(current_time, 60);
        assert_eq!(counter.capacity_remaining(next_window_time).unwrap(), 5);
    }

    #[test]
    fn test_capacity_remaining_large_numbers() {
        let counter = FixedWindowCounterCore::new(u64::MAX, 60);
        let current_time = stable_base_time();

        // Should handle maximum capacity
        assert_eq!(counter.capacity_remaining(current_time).unwrap(), u64::MAX);

        // Use some large amount
        let large_amount = u64::MAX / 2;
        assert!(counter.try_acquire_at(current_time, large_amount).is_ok());

        let remaining = counter.capacity_remaining(current_time + 1).unwrap();
        assert_eq!(remaining, u64::MAX - large_amount);

        // Use remaining capacity
        assert!(counter.try_acquire_at(current_time + 10, remaining).is_ok());
        assert_eq!(counter.capacity_remaining(current_time + 15).unwrap(), 0);
    }

    #[test]
    fn test_capacity_remaining_or_0_success_cases() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let current_time = stable_base_time();

        // Should return capacity when no error
        assert_eq!(counter.capacity_remaining_or_0(current_time), 10);

        // After using some capacity
        assert!(counter.try_acquire_at(current_time, 4).is_ok());
        assert_eq!(counter.capacity_remaining_or_0(current_time + 10), 6);
    }

    #[test]
    fn test_capacity_remaining_or_0_error_cases() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let current_time = stable_base_time();

        // Establish current window
        assert!(counter.try_acquire_at(current_time, 3).is_ok());

        // With expired tick, should return 0 instead of error
        assert_eq!(counter.capacity_remaining_or_0(past(current_time, 100)), 0);

        // Valid tick should still return actual capacity
        assert_eq!(counter.capacity_remaining_or_0(current_time + 10), 7);
    }

    #[test]
    fn test_capacity_remaining_state_updates_correctly() {
        let counter = FixedWindowCounterCore::new(10, 60);
        let current_time = stable_base_time();

        // Initial state
        assert_eq!(counter.capacity_remaining(current_time).unwrap(), 10);

        // Capacity check should update window state if needed
        let future_window_time = next_window(current_time, 60) + 120; // 2 windows later
        assert_eq!(counter.capacity_remaining(future_window_time).unwrap(), 10);

        // Use some capacity in the new window
        assert!(counter.try_acquire_at(future_window_time + 5, 6).is_ok());
        assert_eq!(
            counter.capacity_remaining(future_window_time + 10).unwrap(),
            4
        );

        // Going back to check an earlier time in same window should work
        assert_eq!(
            counter.capacity_remaining(future_window_time + 15).unwrap(),
            4
        );
    }
}
