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
    #[inline(always)]
    fn from(config: FixedWindowCounterCoreConfig) -> Self {
        FixedWindowCounterCore::new(config.capacity, config.window_size)
    }
}

#[cfg(test)]
mod tests {
    use crate::RateLimitError;
    use crate::{algorithm::fixed_window_counter::FixedWindowCounterCore, test_utils::Time};

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
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();
        let mut failed_count = 0;
        let mut success_count = 0;

        // Act
        let acquire_1_res = counter.try_acquire_at(current_time, 0);
        for _ in 1..5 {
            let acquire_res = counter.try_acquire_at(time.advance(1), 1);
            match acquire_res {
                Ok(_) => success_count += 1,
                Err(_) => failed_count += 1,
            }
        }

        // Assert
        assert!(acquire_1_res.is_ok());
        assert_eq!(success_count, 4);
        assert_eq!(failed_count, 0);
    }

    #[test]
    fn test_try_acquire_at_beyond_capacity() {
        let counter = FixedWindowCounterCore::new(10, 60);

        // Request exceeds total capacity
        let current_time = Time::init().now();
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
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act - try to acquire 8 tokens, then 3 tokens, then 2 tokens
        let acquire_res_1 = counter.try_acquire_at(current_time, 8);
        let acquire_res_2 = counter.try_acquire_at(time.advance(10), 3);
        let acquire_res_3 = counter.try_acquire_at(time.advance(5), 2);

        // Assert - first request should succeed, second should fail, third should succeed
        assert!(acquire_res_1.is_ok());
        assert!(acquire_res_2.is_err());
        // Request would exceed remaining capacity
        match acquire_res_2 {
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
        assert!(acquire_res_3.is_ok());
    }

    #[test]
    fn test_try_acquire_at_window_transitions() {
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act - try to acquire 10 tokens, then 1 token, then another 10 tokens in next window
        let acquire_res_1 = counter.try_acquire_at(current_time, 10);
        let acquire_res_2 = counter.try_acquire_at(time.advance(1), 1);
        let acquire_res_3 = counter.try_acquire_at(time.advance(60), 10);

        // Assert - first request should succeed, second should fail, third should succeed
        assert!(acquire_res_1.is_ok());
        match acquire_res_2 {
            Err(RateLimitError::InsufficientCapacity { .. }) => {}
            _ => panic!("Expected InsufficientCapacity error"),
        }
        assert!(acquire_res_3.is_ok());
    }

    #[test]
    fn test_try_acquire_at_expired_tick() {
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act - try to acquire 5 tokens, then 1 token in the past
        let acquire_res_1 = counter.try_acquire_at(current_time, 5);
        let acquire_res_2 = counter.try_acquire_at(time.past(300), 1);

        // Assert - first request should succeed, second should fail
        assert!(acquire_res_1.is_ok());
        match acquire_res_2 {
            Err(RateLimitError::ExpiredTick { .. }) => {}
            _ => panic!("Expected ExpiredTick error"),
        }
    }

    #[test]
    fn test_try_acquire_at_overflow_protection() {
        // Arrange
        let counter = FixedWindowCounterCore::new(u64::MAX, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act - try to acquire u64::MAX tokens, then 1 token
        let acquire_res_1 = counter.try_acquire_at(current_time, u64::MAX);
        let acquire_res_2 = counter.try_acquire_at(time.advance(10), 1);

        // Assert - first request should succeed, second should fail
        assert!(acquire_res_1.is_ok());
        match acquire_res_2 {
            Err(RateLimitError::InsufficientCapacity { .. }) => {}
            _ => panic!("Expected InsufficientCapacity error"),
        }
    }

    #[test]
    fn test_capacity_remaining_after_acquisitions() {
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act
        // check remaining capacity
        // acquire 4 tokens, check remaining capacity again
        // acquire 4 tokens, check remaining capacity again
        let remaining_1 = counter.capacity_remaining(current_time).unwrap();
        let _ = counter.try_acquire_at(current_time, 4);
        let remaining_2 = counter.capacity_remaining(time.advance(1)).unwrap();
        let _ = counter.try_acquire_at(time.advance(1), 4);
        let remaining_3 = counter.capacity_remaining(time.advance(1)).unwrap();

        // Assert
        assert_eq!(remaining_1, 10);
        assert_eq!(remaining_2, 6);
        assert_eq!(remaining_3, 2);
    }

    #[test]
    fn test_capacity_remaining_expired_tick() {
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act
        // establish current window
        // try to check capacity with expired tick
        // and then check capacity with a valid tick
        let _ = counter.try_acquire_at(current_time, 5);
        let remaining_1 = counter.capacity_remaining(time.advance(10)).unwrap();
        let remaining_2 = counter.capacity_remaining(time.past(110));
        let remaining_3 = counter.capacity_remaining(time.advance(110)).unwrap();

        // Assert
        assert_eq!(remaining_1, 5);
        match remaining_2 {
            Err(RateLimitError::ExpiredTick {
                min_acceptable_tick,
            }) => {
                // Should return the window start time as minimum acceptable
                let expected_window_start = (current_time / 60) * 60;
                assert_eq!(min_acceptable_tick, expected_window_start);
            }
            _ => panic!("Expected ExpiredTick error"),
        }
        assert_eq!(remaining_3, 5);
    }

    #[test]
    fn test_capacity_remaining_or_0_success_cases() {
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act
        // check capacity when no error
        // acquire some capacity
        // check capacity again
        let remaining_1 = counter.capacity_remaining_or_0(current_time);
        let _ = counter.try_acquire_at(current_time, 4);
        let remaining_2 = counter.capacity_remaining_or_0(time.advance(10));

        // Assert
        assert_eq!(remaining_1, 10);
        assert_eq!(remaining_2, 6);
    }

    #[test]
    fn test_capacity_remaining_or_0_error_cases() {
        // Arrange
        let counter = FixedWindowCounterCore::new(10, 60);
        let mut time = Time::init();
        let current_time = time.now();

        // Act
        // establish current window
        // with expired tick, should return 0 instead of error
        let _ = counter.try_acquire_at(current_time, 3);
        let remaining_1 = counter.capacity_remaining_or_0(time.past(100));
        // Valid tick should still return actual capacity
        let remaining_2 = counter.capacity_remaining_or_0(time.advance(100));

        // Assert
        assert_eq!(remaining_1, 0);
        assert_eq!(remaining_2, 7);
    }
}
