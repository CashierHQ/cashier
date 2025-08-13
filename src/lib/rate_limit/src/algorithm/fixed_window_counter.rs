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
/// - Time is divided into fixed windows of `window_duration_seconds` duration
/// - Each window has independent capacity tracking
/// - Counters reset to zero at the start of each new window
/// - Requests are accepted if they don't exceed the window's remaining capacity
///
/// # Window Boundaries
///
/// Windows are aligned to multiples of `window_duration_seconds`:
/// - Window 0: [0, window_duration_seconds-1]
/// - Window 1: [window_duration_seconds, 2*window_duration_seconds-1]
/// - Window 2: [2*window_duration_seconds, 3*window_duration_seconds-1]
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
    /// * `window_duration_seconds` - Duration of each window
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
    pub fn new(capacity: u64, window_duration_seconds: u64) -> Self {
        assert!(capacity > 0, "capacity must be greater than 0");
        assert!(
            window_duration_seconds > 0,
            "window_duration_seconds must be greater than 0"
        );

        FixedWindowCounterCore {
            capacity,
            window_duration: window_duration_seconds,
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
            let retry_after_seconds = next_window_tick.saturating_sub(current_tick);

            Err(RateLimitError::InsufficientCapacity {
                acquiring: tokens,
                available,
                retry_after_ticks: retry_after_seconds,
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

    /// Gets the current remaining capacity without updating window state.
    ///
    /// This method simply returns the remaining tokens that can be acquired in
    /// the current window **without** checking or triggering a window change.
    /// Useful for lightweight queries when you do not want to touch state.
    ///
    /// # Returns
    /// * `remaining_capacity` - Remaining capacity in current window (without window update)
    #[inline(always)]
    pub fn current_capacity(&self) -> u64 {
        let state = self.state.borrow();

        self.capacity.saturating_sub(state.count)
    }

    /// Returns the current remaining capacity
    /// This method is a convenience wrapper around `current_capacity`
    #[inline(always)]
    pub fn current_capacity_or_0(&self) -> u64 {
        self.current_capacity()
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
    pub fn new(capacity: u64, window_size_seconds: u64) -> Self {
        Self {
            capacity,
            window_size: window_size_seconds,
        }
    }
}

impl From<FixedWindowCounterCoreConfig> for FixedWindowCounterCore {
    /// Converts a `FixedWindowCounterCoreConfig` into a `FixedWindowCounterCore` instance.
    ///
    /// # Panics
    /// This method will panic if either `capacity` or `window_size_seconds` is zero.
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
    ///     window_size_seconds: 60,
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
    ///     window_size_seconds: 60,
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
}
