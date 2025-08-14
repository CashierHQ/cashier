use std::time::Duration;

use crate::{
    algorithm::fixed_window_counter::{FixedWindowCounterCore, FixedWindowCounterCoreConfig},
    percision::Precision,
};

pub mod config;
pub mod types;
pub use types::{LimiterEntry, RateLimitConfig, RateLimitState, ServiceError, ServiceSettings};

/// Service for managing multiple rate limiters with different identifiers and methods
pub struct RateLimitService<E, P>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    P: Precision,
{
    /// Grouped state containing all rate limiting data
    state: RateLimitState<E, P>,
}

impl<E, P> RateLimitService<E, P>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    P: Precision,
{
    /// Create a new empty rate limit service with default settings
    pub fn new(settings: ServiceSettings<P>) -> Self {
        Self {
            state: RateLimitState::new(settings),
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
        config: RateLimitConfig<P>,
    ) -> Result<(), ServiceError> {
        // Validate configuration
        if config.capacity == 0 {
            return Err(ServiceError::InvalidConfiguration {
                message: "Capacity must be greater than 0".to_string(),
            });
        }
        if config.window_size == 0 {
            return Err(ServiceError::InvalidConfiguration {
                message: "Window size must be greater than 0".to_string(),
            });
        }

        self.state.method_configs.insert(method.to_string(), config);
        Ok(())
    }

    /// Get or create a rate limiter for a specific (identifier, method) combination
    fn get_or_create_limiter(
        &mut self,
        identifier: &E,
        method: &str,
        timestamp_ticks: u64,
    ) -> Result<&mut LimiterEntry, ServiceError> {
        let key = (identifier.clone(), method.to_string());

        // If limiter doesn't exist, create it using the method's configuration
        if !self.state.runtime_limiters.contains_key(&key) {
            let config = self.state.method_configs.get(method).ok_or_else(|| {
                ServiceError::MethodNotConfigured {
                    method: method.to_string(),
                }
            })?;

            let counter_config =
                FixedWindowCounterCoreConfig::new(config.capacity, config.window_size);
            let counter = FixedWindowCounterCore::from(counter_config);
            let timestamped_counter = LimiterEntry::new(counter, timestamp_ticks);
            self.state
                .runtime_limiters
                .insert(key.clone(), timestamped_counter);
        }

        Ok(self.state.runtime_limiters.get_mut(&key).unwrap())
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

        let limiter_entry = self
            .get_or_create_limiter(&identifier, method, timestamp_ticks)
            .map_err(
                |_| crate::algorithm::types::RateLimitError::BeyondCapacity {
                    acquiring: tokens,
                    capacity: 0,
                },
            )?;

        // Update the access timestamp
        limiter_entry.touch(timestamp_ticks);

        // Try to acquire tokens from the underlying counter
        limiter_entry
            .counter()
            .try_acquire_at(timestamp_ticks, tokens)
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

    /// Clean up old counters based on the delete threshold
    fn cleanup_old_counters(&mut self, current_timestamp_ticks: u64, threshold_ticks: u64) {
        let cutoff_time = current_timestamp_ticks.saturating_sub(threshold_ticks);

        self.state
            .runtime_limiters
            .retain(|_, limiter_entry| limiter_entry.updated_time() > cutoff_time);
    }

    /// Get all configured methods
    ///
    /// # Returns
    /// Iterator over all configured method names
    pub fn configured_methods(&self) -> impl Iterator<Item = &String> {
        self.state.method_configs.keys()
    }

    /// Get the current service settings
    pub fn settings(&self) -> &ServiceSettings<P> {
        &self.state.settings
    }

    /// Update service settings
    pub fn update_settings(&mut self, settings: ServiceSettings<P>) {
        self.state.settings = settings;
    }

    /// Get statistics about the current runtime limiters
    ///
    /// # Returns
    /// A tuple containing (total_counters, oldest_created_time, oldest_updated_time)
    pub fn get_stats(&self) -> (usize, Option<u64>, Option<u64>) {
        let total_counters = self.state.runtime_limiters.len();
        let oldest_created = self
            .state
            .runtime_limiters
            .values()
            .map(|counter| counter.created_time())
            .min();
        let oldest_updated = self
            .state
            .runtime_limiters
            .values()
            .map(|counter| counter.updated_time())
            .min();

        (total_counters, oldest_created, oldest_updated)
    }

    /// Force cleanup of counters older than the specified threshold
    ///
    /// # Arguments
    /// * `current_timestamp_ticks` - Current timestamp in ticks
    /// * `threshold_ticks` - Age threshold in ticks
    ///
    /// # Returns
    /// Number of counters that were removed
    pub fn force_cleanup(&mut self, current_timestamp_ticks: u64, threshold_ticks: u64) -> usize {
        let initial_count = self.state.runtime_limiters.len();
        self.cleanup_old_counters(current_timestamp_ticks, threshold_ticks);
        initial_count.saturating_sub(self.state.runtime_limiters.len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        algorithm::types::RateLimitError,
        percision::{Millis, Nanos},
        test_utils::Time,
    };
    use candid::Principal;

    /// Test identifier enum demonstrating flexibility of the generic service
    #[derive(Debug, Clone, Hash, PartialEq, Eq)]
    pub enum TestIdentifier {
        /// Rate limiting per specific user principal
        UserPrincipal(Principal),
        /// Global rate limiting for any user
        AnyUser,
    }

    fn get_settings() -> ServiceSettings<Nanos> {
        // setting with 1 hour delete threshold
        ServiceSettings::new(Duration::from_secs(60 * 60))
    }

    fn get_service() -> RateLimitService<TestIdentifier, Nanos> {
        let mut service: RateLimitService<TestIdentifier, Nanos> =
            RateLimitService::new(ServiceSettings::new(Duration::from_secs(60 * 60)));
        service
            .add_config(
                "test",
                RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
            )
            .unwrap();
        service
            .add_config(
                "create_action",
                RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
            )
            .unwrap();
        service
            .add_config(
                "add_token",
                RateLimitConfig::new(60, Duration::from_secs(60 * 10)),
            )
            .unwrap();
        service
    }

    // ===== Constructor Tests =====

    #[test]
    fn test_new_service() {
        // Arrange
        let delete_threshold = Duration::from_secs(3600); // 1 hour
        let settings = ServiceSettings::new(delete_threshold);

        // Act
        let service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new(settings);

        // Assert
        assert_eq!(
            service.state.method_configs.len(),
            0,
            "New service should have no method configurations"
        );
        assert_eq!(
            service.state.runtime_limiters.len(),
            0,
            "New service should have no runtime limiters"
        );
        assert_eq!(
            service.settings().delete_threshold_ticks,
            Some(Nanos::to_ticks(delete_threshold)),
            "Service should have the correct delete threshold settings"
        );
    }

    #[test]
    fn test_new_service_with_zero_threshold() {
        // Arrange
        let zero_threshold = Duration::from_secs(0);
        let settings = ServiceSettings::new(zero_threshold);

        // Act
        let service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new(settings);

        // Assert
        assert_eq!(
            service.state.method_configs.len(),
            0,
            "New service should have no method configurations"
        );
        assert_eq!(
            service.state.runtime_limiters.len(),
            0,
            "New service should have no runtime limiters"
        );
        assert_eq!(
            service.settings().delete_threshold_ticks,
            Some(0),
            "Service should have zero delete threshold when created with zero duration"
        );
    }

    // ===== Configuration Tests =====

    #[test]
    fn test_configured_methods() {
        // Arrange
        let settings = ServiceSettings::new(Duration::from_secs(3600));
        let mut service: RateLimitService<TestIdentifier, Nanos> = RateLimitService::new(settings);
        let method1_config = RateLimitConfig::new(10, Duration::from_secs(60));
        let method2_config = RateLimitConfig::new(20, Duration::from_secs(120));

        // Act
        service.add_config("method1", method1_config).unwrap();
        service.add_config("method2", method2_config).unwrap();
        let methods: Vec<&String> = service.configured_methods().collect();

        // Assert
        assert_eq!(
            methods.len(),
            2,
            "Service should have exactly 2 configured methods"
        );
        assert!(
            methods.contains(&&"method1".to_string()),
            "Service should contain method1"
        );
        assert!(
            methods.contains(&&"method2".to_string()),
            "Service should contain method2"
        );
    }

    // ===== Token Acquisition Tests =====

    #[test]
    fn test_try_acquire_at_success() {
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_acquire_at_zero_tokens() {
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 0);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_acquire_at_beyond_capacity() {
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 15);

        // Assert
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
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 8);
        let result_2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 3);

        // Assert
        assert!(result.is_ok());
        assert!(result_2.is_err());
        match result_2 {
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
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_acquire_at_window_transition() {
        // Arrange
        let mut time = Time::init();
        let mut service = get_service();
        let base_duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 10);
        let result_2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 1);

        // Assert
        assert!(result.is_ok());
        assert!(result_2.is_err());

        // Move to next window - should reset capacity
        time.next_window(600); // 10 minutes window
        let next_duration = Duration::from_secs(time.now());
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", next_duration, 10)
                .is_ok()
        );
    }

    #[test]
    fn test_try_acquire_at_expired_tick() {
        // Arrange
        let mut time = Time::init();
        let mut service = get_service();
        let base_duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 5);
        time.past(300);
        let past_duration = Duration::from_secs(time.now());
        let result_2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", past_duration, 1);

        // Assert
        assert!(result.is_ok());
        assert!(result_2.is_err());
        match result_2 {
            Err(RateLimitError::ExpiredTick { .. }) => {}
            _ => panic!("Expected ExpiredTick error"),
        }
    }
    // ===== Multiple Identifiers Tests =====

    #[test]
    fn test_multiple_identifiers() {
        // Arrange
        let mut service = get_service();
        let time = Time::init();
        let duration = Duration::from_secs(time.now());
        let principal = Principal::from_text("2vxsx-fae").unwrap();

        // Act
        let result_1 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let result_2 = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );

        // Assert
        assert!(result_1.is_ok());
        assert!(result_2.is_ok());

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
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

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
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "nonexistent", duration, 1);
        assert!(result.is_err());
        // Should return BeyondCapacity error when method is not configured
        match result {
            Err(RateLimitError::BeyondCapacity { .. }) => {}
            _ => panic!("Expected BeyondCapacity error"),
        }
    }

    #[test]
    fn test_add_config_invalid_capacity() {
        // Arrange
        let mut service = get_service();

        // Act
        let result = service.add_config("test", RateLimitConfig::new(0, Duration::from_secs(60)));

        // Assert
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
        // Arrange
        let mut service = get_service();

        // Act
        let result = service.add_config("test", RateLimitConfig::new(10, Duration::from_secs(0)));

        // Assert
        assert!(result.is_err());
        match result {
            Err(ServiceError::InvalidConfiguration { message }) => {
                assert!(message.contains("Window size must be greater than 0"));
            }
            _ => panic!("Expected InvalidConfiguration error"),
        }
    }

    #[test]
    fn test_nanos_precision_force_cleanup() {
        // Arrange
        let mut time = Time::init();
        let mut service = get_service();
        let base_duration = Duration::from_secs(time.now());

        // Act - Create some limiters at base time
        service
            .try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 5)
            .unwrap();
        service
            .try_acquire_at(TestIdentifier::AnyUser, "create_action", base_duration, 3)
            .unwrap();

        let initial_count = service.get_stats().0;
        assert_eq!(initial_count, 2, "Should have 2 limiters initially");

        // Advance time by 2 hours (7200 seconds)
        time.advance(7200);
        let future_duration = Duration::from_secs(time.now());

        // Force cleanup with 1 hour threshold (should remove all limiters created 2 hours ago)
        let current_ticks = Nanos::to_ticks(future_duration);
        let threshold_ticks = Nanos::to_ticks(Duration::from_secs(3600)); // 1 hour threshold
        let removed_count = service.force_cleanup(current_ticks, threshold_ticks);

        // Assert
        assert_eq!(
            removed_count, 2,
            "Nanos precision cleanup should remove all old limiters"
        );
        assert_eq!(
            service.get_stats().0,
            0,
            "Nanos precision service should have no limiters after cleanup"
        );
    }

    // ===== Millis Precision Tests =====

    fn get_millis_service() -> RateLimitService<TestIdentifier, Millis> {
        let mut service: RateLimitService<TestIdentifier, Millis> =
            RateLimitService::new(ServiceSettings::new(Duration::from_secs(60 * 60)));
        service
            .add_config(
                "test",
                RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
            )
            .unwrap();
        service
            .add_config(
                "create_action",
                RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
            )
            .unwrap();
        service
            .add_config(
                "add_token",
                RateLimitConfig::new(60, Duration::from_secs(60 * 10)),
            )
            .unwrap();
        service
    }

    #[test]
    fn test_millis_precision_new_service() {
        // Arrange
        let delete_threshold = Duration::from_secs(3600); // 1 hour
        let settings = ServiceSettings::new(delete_threshold);

        // Act
        let service: RateLimitService<TestIdentifier, Millis> = RateLimitService::new(settings);

        // Assert
        assert_eq!(
            service.state.method_configs.len(),
            0,
            "New millis service should have no method configurations"
        );
        assert_eq!(
            service.state.runtime_limiters.len(),
            0,
            "New millis service should have no runtime limiters"
        );
        assert_eq!(
            service.settings().delete_threshold_ticks,
            Some(Millis::to_ticks(delete_threshold)),
            "Millis service should have the correct delete threshold settings"
        );
    }

    #[test]
    fn test_millis_precision_try_acquire_at_success() {
        // Arrange
        let time = Time::init();
        let mut service = get_millis_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);

        // Assert
        assert!(
            result.is_ok(),
            "Millis precision should successfully acquire tokens"
        );
    }

    #[test]
    fn test_millis_precision_try_acquire_at_beyond_capacity() {
        // Arrange
        let time = Time::init();
        let mut service = get_millis_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 15);

        // Assert
        match result {
            Err(RateLimitError::BeyondCapacity {
                acquiring,
                capacity,
            }) => {
                assert_eq!(acquiring, 15);
                assert_eq!(capacity, 10);
            }
            _ => panic!("Expected BeyondCapacity error for millis precision"),
        }
    }

    #[test]
    fn test_millis_precision_window_transition() {
        // Arrange
        let mut time = Time::init();
        let mut service = get_millis_service();
        let base_duration = Duration::from_secs(time.now());

        // Act - Fill the window
        let result = service.try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 10);
        let result_2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 1);

        // Assert - Should fail after capacity is exhausted
        assert!(result.is_ok());
        assert!(result_2.is_err());

        // Move to next window - should reset capacity
        time.next_window(600); // 10 minutes window
        let next_duration = Duration::from_secs(time.now());
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", next_duration, 10)
                .is_ok(),
            "Millis precision should reset capacity in new window"
        );
    }

    #[test]
    fn test_millis_precision_multiple_methods() {
        // Arrange
        let time = Time::init();
        let mut service = get_millis_service();
        let duration = Duration::from_secs(time.now());

        // Act - Test different methods with millis precision
        let result1 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let result2 = service.try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5);
        let result3 = service.try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30);

        // Assert - All should succeed with separate capacities
        assert!(
            result1.is_ok(),
            "Millis precision test method should succeed"
        );
        assert!(
            result2.is_ok(),
            "Millis precision create_action method should succeed"
        );
        assert!(
            result3.is_ok(),
            "Millis precision add_token method should succeed"
        );

        // Test remaining capacity
        let result4 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let result5 = service.try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5);
        let result6 = service.try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30);

        assert!(
            result4.is_ok(),
            "Millis precision test method should have remaining capacity"
        );
        assert!(
            result5.is_ok(),
            "Millis precision create_action method should have remaining capacity"
        );
        assert!(
            result6.is_ok(),
            "Millis precision add_token method should have remaining capacity"
        );
    }

    #[test]
    fn test_millis_precision_multiple_identifiers() {
        // Arrange
        let mut service = get_millis_service();
        let time = Time::init();
        let duration = Duration::from_secs(time.now());
        let principal = Principal::from_text("2vxsx-fae").unwrap();

        // Act - Test different identifiers with millis precision
        let result_1 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let result_2 = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );

        // Assert - Each should have their own capacity
        assert!(result_1.is_ok(), "Millis precision AnyUser should succeed");
        assert!(
            result_2.is_ok(),
            "Millis precision UserPrincipal should succeed"
        );

        // Test remaining capacity for each
        let result1 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let result2 = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );
        assert!(
            result1.is_ok(),
            "Millis precision AnyUser should have remaining capacity"
        );
        assert!(
            result2.is_ok(),
            "Millis precision UserPrincipal should have remaining capacity"
        );
    }

    #[test]
    fn test_millis_precision_try_acquire_one_at() {
        // Arrange
        let time = Time::init();
        let mut service = get_millis_service();
        let duration = Duration::from_secs(time.now());

        // Act
        let result = service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);

        // Assert
        assert!(
            result.is_ok(),
            "Millis precision should successfully acquire one token"
        );
    }

    #[test]
    fn test_millis_precision_configured_methods() {
        // Arrange
        let settings = ServiceSettings::new(Duration::from_secs(3600));
        let mut service: RateLimitService<TestIdentifier, Millis> = RateLimitService::new(settings);
        let method1_config = RateLimitConfig::new(10, Duration::from_secs(60));
        let method2_config = RateLimitConfig::new(20, Duration::from_secs(120));

        // Act
        service.add_config("method1", method1_config).unwrap();
        service.add_config("method2", method2_config).unwrap();
        let methods: Vec<&String> = service.configured_methods().collect();

        // Assert
        assert_eq!(
            methods.len(),
            2,
            "Millis precision service should have exactly 2 configured methods"
        );
        assert!(
            methods.contains(&&"method1".to_string()),
            "Millis precision service should contain method1"
        );
        assert!(
            methods.contains(&&"method2".to_string()),
            "Millis precision service should contain method2"
        );
    }

    #[test]
    fn test_millis_precision_get_stats() {
        // Arrange
        let time = Time::init();
        let mut service = get_millis_service();
        let duration = Duration::from_secs(time.now());

        // Act - Create some limiters
        service
            .try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5)
            .unwrap();
        service
            .try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 3)
            .unwrap();

        let (total_counters, oldest_created, oldest_updated) = service.get_stats();

        // Assert
        assert_eq!(
            total_counters, 2,
            "Millis precision service should have 2 runtime limiters"
        );
        assert!(
            oldest_created.is_some(),
            "Millis precision service should have created timestamps"
        );
        assert!(
            oldest_updated.is_some(),
            "Millis precision service should have updated timestamps"
        );
    }

    #[test]
    fn test_millis_precision_force_cleanup() {
        // Arrange
        let mut time = Time::init();
        let mut service = get_millis_service();
        let base_duration = Duration::from_secs(time.now());

        // Act - Create some limiters at base time
        service
            .try_acquire_at(TestIdentifier::AnyUser, "test", base_duration, 5)
            .unwrap();
        service
            .try_acquire_at(TestIdentifier::AnyUser, "create_action", base_duration, 3)
            .unwrap();

        let initial_count = service.get_stats().0;
        assert_eq!(initial_count, 2, "Should have 2 limiters initially");

        // Advance time by 2 hours (7200 seconds)
        time.advance(7200);
        let future_duration = Duration::from_secs(time.now());

        // Force cleanup with 1 hour threshold (should remove all limiters created 2 hours ago)
        let current_ticks = Millis::to_ticks(future_duration);
        let threshold_ticks = Millis::to_ticks(Duration::from_secs(3600)); // 1 hour threshold
        let removed_count = service.force_cleanup(current_ticks, threshold_ticks);

        // Assert
        assert_eq!(
            removed_count, 2,
            "Millis precision cleanup should remove all old limiters"
        );
        assert_eq!(
            service.get_stats().0,
            0,
            "Millis precision service should have no limiters after cleanup"
        );
    }
}
