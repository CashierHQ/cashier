use std::collections::HashMap;
use std::time::Duration;

use crate::algorithm::fixed_window_counter::{
    FixedWindowCounterCore, FixedWindowCounterCoreConfig,
};
use crate::percision::Precision;

pub mod types;
pub use types::{RateLimitConfig, ServiceError};

/// Service for managing multiple rate limiters with different identifiers and methods
pub struct RateLimitService<E, P>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    P: Precision,
{
    /// Configuration for each method (set once during initialization)
    method_configs: HashMap<String, RateLimitConfig>,
    /// Runtime tracking for each (identifier, method) pair (created on-demand)
    runtime_limiters: HashMap<(E, String), FixedWindowCounterCore>,
    /// Phantom data to hold the precision type
    _precision: std::marker::PhantomData<P>,
}

impl<E, P> RateLimitService<E, P>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    P: Precision,
{
    /// Create a new empty rate limit service
    pub fn new() -> Self {
        Self {
            method_configs: HashMap::new(),
            runtime_limiters: HashMap::new(),
            _precision: std::marker::PhantomData,
        }
    }

    /// Configure rate limits for a specific method (set once during initialization)
    ///
    /// # Arguments
    /// * `method` - The method/action being rate limited (e.g., "login", "api_call", "send_message")
    /// * `config` - Rate limit configuration for this method
    pub fn add_config(
        &mut self,
        method: &str,
        config: RateLimitConfig,
    ) -> Result<(), ServiceError> {
        // Validate configuration
        if config.capacity == 0 {
            return Err(ServiceError::InvalidConfiguration {
                message: "Capacity must be greater than 0".to_string(),
            });
        }
        if config.window_size_seconds == 0 {
            return Err(ServiceError::InvalidConfiguration {
                message: "Window size must be greater than 0".to_string(),
            });
        }

        self.method_configs.insert(method.to_string(), config);
        Ok(())
    }

    /// Get or create a rate limiter for a specific (identifier, method) combination
    fn get_or_create_limiter(
        &mut self,
        identifier: &E,
        method: &str,
    ) -> Result<&mut FixedWindowCounterCore, ServiceError> {
        let key = (identifier.clone(), method.to_string());

        // If limiter doesn't exist, create it using the method's configuration
        if !self.runtime_limiters.contains_key(&key) {
            let config = self.method_configs.get(method).ok_or_else(|| {
                ServiceError::MethodNotConfigured {
                    method: method.to_string(),
                }
            })?;

            let counter_config =
                FixedWindowCounterCoreConfig::new(config.capacity, config.window_size_seconds);
            let counter = FixedWindowCounterCore::from(counter_config);
            self.runtime_limiters.insert(key.clone(), counter);
        }

        Ok(self.runtime_limiters.get_mut(&key).unwrap())
    }

    /// Try to acquire tokens for a specific identifier and method at the current timestamp
    ///
    /// # Arguments
    /// * `identifier` - The user/entity identifier
    /// * `method` - The method/action being rate limited
    /// * `duration` - Current duration
    /// * `tokens` - Number of tokens to acquire
    ///
    /// # Returns
    /// * `Ok(())` - If tokens were successfully acquired
    /// * `Err(RateLimitError)` - Detailed error with retry information
    /// * `Err(ServiceError)` - Service configuration error
    pub fn try_acquire_at(
        &mut self,
        identifier: E,
        method: &str,
        duration: Duration,
        tokens: u64,
    ) -> Result<(), crate::algorithm::types::RateLimitError> {
        let timestamp_ticks = P::to_ticks(duration);
        let timestamp_seconds = P::from_ticks(timestamp_ticks).as_secs();
        let limiter = self
            .get_or_create_limiter(&identifier, method)
            .map_err(
                |_| crate::algorithm::types::RateLimitError::BeyondCapacity {
                    acquiring: tokens,
                    capacity: 0,
                },
            )?;
        limiter.try_acquire_at(timestamp_seconds, tokens)
    }

    /// Try to acquire a single token for a specific identifier and method
    ///
    /// # Arguments
    /// * `identifier` - The user/entity identifier
    /// * `method` - The method/action being rate limited
    /// * `duration` - Current duration
    ///
    /// # Returns
    /// * `Ok(())` - If token was successfully acquired
    /// * `Err(RateLimitError)` - Detailed error with retry information
    /// * `Err(ServiceError)` - Service configuration error
    pub fn try_acquire_one_at(
        &mut self,
        identifier: E,
        method: &str,
        duration: Duration,
    ) -> Result<(), crate::algorithm::types::RateLimitError> {
        self.try_acquire_at(identifier, method, duration, 1)
    }

    /// Get all configured methods
    ///
    /// # Returns
    /// Iterator over all configured method names
    pub fn configured_methods(&self) -> impl Iterator<Item = &String> {
        self.method_configs.keys()
    }
}

impl<E, P> Default for RateLimitService<E, P>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    P: Precision,
{
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::algorithm::types::RateLimitError;
    use crate::percision::Nanos;
    use candid::Principal;

    /// Test identifier enum demonstrating flexibility of the generic service
    #[derive(Debug, Clone, Hash, PartialEq, Eq)]
    pub enum TestIdentifier {
        /// Rate limiting per specific user principal
        UserPrincipal(Principal),
        /// Global rate limiting for any user
        AnyUser,
    }

    /// Helper function to get a timestamp at the start of the next window relative to base time
    ///
    /// # Arguments
    /// * `base_time` - The reference time to calculate from
    /// * `window_size` - The window size in seconds
    ///
    /// # Returns
    /// Timestamp at the start of the next window after `base_time`
    fn next_window(base_time: u64, window_size: u64) -> u64 {
        ((base_time / window_size) + 1) * window_size
    }

    /// Helper function to get a stable base time for testing
    /// This returns a predictable timestamp that aligns well with window boundaries
    fn stable_base_time_ns() -> u64 {
        // Use a fixed timestamp that's safely in the middle of a window
        // This makes tests more predictable by avoiding window boundary issues
        //  Wednesday, 13 August 2025 10:51:33 in nanoseconds
        1755082293 * 1_000_000_000
    }

    fn get_service() -> RateLimitService<TestIdentifier, Nanos> {
        let mut service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new();
        service
            .add_config(
                "test",
                RateLimitConfig {
                    capacity: 10,
                    window_size_seconds: 60,
                },
            )
            .unwrap();
        service
            .add_config(
                "create_action",
                RateLimitConfig {
                    capacity: 10,
                    window_size_seconds: 60,
                },
            )
            .unwrap();
        service
            .add_config(
                "add_token",
                RateLimitConfig {
                    capacity: 60,
                    window_size_seconds: 60,
                },
            )
            .unwrap();
        service
    }

    // ===== Constructor Tests =====

    #[test]
    fn test_new_service() {
        let service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new();
        assert_eq!(service.method_configs.len(), 0);
        assert_eq!(service.runtime_limiters.len(), 0);
    }

    #[test]
    fn test_default_service() {
        let service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::default();
        assert_eq!(service.method_configs.len(), 0);
        assert_eq!(service.runtime_limiters.len(), 0);
    }

    // ===== Configuration Tests =====

    #[test]
    fn test_configured_methods() {
        let mut service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new();

        service
            .add_config(
                "method1",
                RateLimitConfig {
                    capacity: 10,
                    window_size_seconds: 60,
                },
            )
            .unwrap();
        service
            .add_config(
                "method2",
                RateLimitConfig {
                    capacity: 20,
                    window_size_seconds: 120,
                },
            )
            .unwrap();

        let methods: Vec<&String> = service.configured_methods().collect();
        assert_eq!(methods.len(), 2);
        assert!(methods.contains(&&"method1".to_string()));
        assert!(methods.contains(&&"method2".to_string()));
    }

    // ===== Token Acquisition Tests =====

    #[test]
    fn test_try_acquire_at_success() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());

        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_acquire_at_zero_tokens() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());

        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_acquire_at_beyond_capacity() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());

        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 15);
        match result {
            Err(RateLimitError::BeyondCapacity {
                acquiring,
                capacity,
            }) => {
                assert_eq!(acquiring, 15);
                assert_eq!(capacity, 10);
            }
            _ => panic!("Expected BeyondCapacity error"),
        }
    }

    #[test]
    fn test_try_acquire_at_insufficient_capacity() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());

        // Use up most capacity
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration, 8)
                .is_ok()
        );

        // Try to acquire more than remaining
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 3);
        match result {
            Err(RateLimitError::InsufficientCapacity {
                acquiring,
                available,
                ..
            }) => {
                assert_eq!(acquiring, 3);
                assert_eq!(available, 2);
            }
            _ => panic!("Expected InsufficientCapacity error"),
        }
    }

    #[test]
    fn test_try_acquire_one_at() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());

        let result = service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_acquire_at_window_transition() {
        let mut service = get_service();
        let base_time = stable_base_time_ns();
        let base_duration = Duration::from_nanos(base_time);

        // Fill up first window
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 10)
                .is_ok()
        );

        // Should be at capacity
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 1);
        assert!(result.is_err());

        // Move to next window - should reset capacity
        let next_window_time = next_window(base_time / 1_000_000_000, 60);
        let next_duration = Duration::from_secs(next_window_time);
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", next_duration, 10)
                .is_ok()
        );
    }

    #[test]
    fn test_try_acquire_at_expired_tick() {
        let mut service = get_service();
        let base_time = stable_base_time_ns();
        let base_duration = Duration::from_nanos(base_time);

        // Establish current window
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 5)
                .is_ok()
        );

        // Try to go backwards in time
        let past_duration = Duration::from_nanos(base_time - 300_000_000_000); // 5 minutes ago
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", past_duration, 1);
        match result {
            Err(RateLimitError::ExpiredTick { .. }) => {}
            _ => panic!("Expected ExpiredTick error"),
        }
    }
    // ===== Multiple Identifiers Tests =====

    #[test]
    fn test_multiple_identifiers() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());
        let principal = Principal::from_text("2vxsx-fae").unwrap();

        // Different identifiers should have separate limiters
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5)
                .is_ok()
        );
        assert!(
            service
                .try_acquire_at(
                    TestIdentifier::UserPrincipal(principal),
                    "test",
                    duration,
                    5
                )
                .is_ok()
        );

        // Each should have their own capacity
        let result1 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let result2 = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );
        assert!(result1.is_ok());
        assert!(result2.is_ok());
    }

    // ===== Multiple Methods Tests =====

    #[test]
    fn test_multiple_methods() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());

        // Different methods should have separate limiters
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5)
                .is_ok()
        );
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5)
                .is_ok()
        );
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30)
                .is_ok()
        );

        // Each should have their own capacity
        let result1 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let result2 = service.try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5);
        let result3 = service.try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30);

        assert!(result1.is_ok());
        assert!(result2.is_ok());
        assert!(result3.is_ok());
    }

    // ===== Error Handling Tests =====

    #[test]
    fn test_try_acquire_at_unconfigured_method() {
        let mut service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new();
        let duration = Duration::from_nanos(stable_base_time_ns());

        let result = service.try_acquire_at(TestIdentifier::AnyUser, "nonexistent", duration, 1);
        assert!(result.is_err());
        // Should return BeyondCapacity error when method is not configured
        match result {
            Err(crate::algorithm::types::RateLimitError::BeyondCapacity { .. }) => {}
            _ => panic!("Expected BeyondCapacity error"),
        }
    }

    #[test]
    fn test_add_config_invalid_capacity() {
        let mut service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new();

        let result = service.add_config(
            "test",
            RateLimitConfig {
                capacity: 0,
                window_size_seconds: 60,
            },
        );

        assert!(result.is_err());
        match result {
            Err(ServiceError::InvalidConfiguration { message }) => {
                assert!(message.contains("Capacity must be greater than 0"));
            }
            _ => panic!("Expected InvalidConfiguration error"),
        }
    }

    #[test]
    fn test_add_config_invalid_window_size() {
        let mut service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new();

        let result = service.add_config(
            "test",
            RateLimitConfig {
                capacity: 10,
                window_size_seconds: 0,
            },
        );

        assert!(result.is_err());
        match result {
            Err(ServiceError::InvalidConfiguration { message }) => {
                assert!(message.contains("Window size must be greater than 0"));
            }
            _ => panic!("Expected InvalidConfiguration error"),
        }
    }

    // ===== Precision Tests =====

    #[test]
    fn test_different_precisions() {
        // Test with Nanos precision
        let mut service_nanos: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new();
        service_nanos
            .add_config(
                "test",
                RateLimitConfig {
                    capacity: 10,
                    window_size_seconds: 60,
                },
            )
            .unwrap();

        let duration = Duration::from_nanos(stable_base_time_ns());
        assert!(
            service_nanos
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration, 1)
                .is_ok()
        );

        // Test with Millis precision
        let mut service_millis: RateLimitService<TestIdentifier, crate::percision::Millis> =
            RateLimitService::new();
        service_millis
            .add_config(
                "test",
                RateLimitConfig {
                    capacity: 10,
                    window_size_seconds: 60,
                },
            )
            .unwrap();

        let duration_millis = Duration::from_millis(stable_base_time_ns() / 1_000_000);
        assert!(
            service_millis
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration_millis, 1)
                .is_ok()
        );
    }
}
