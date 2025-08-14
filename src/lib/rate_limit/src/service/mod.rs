use std::time::Duration;

use crate::algorithm::fixed_window_counter::{
    FixedWindowCounterCore, FixedWindowCounterCoreConfig,
};

pub mod config;
pub mod types;
pub use types::{
    LimiterEntry, PrecisionType, RateLimitConfig, RateLimitState, ServiceError, ServiceSettings,
};

/// Service for managing multiple rate limiters with different identifiers and methods
pub struct RateLimitService<E>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
{
    /// Grouped state containing all rate limiting data
    state: RateLimitState<E>,
}

impl<E> RateLimitService<E>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
{
    /// Create a new empty rate limit service with default settings
    pub fn new() -> Self {
        Self {
            state: RateLimitState::new(),
        }
    }

    /// Create a new empty rate limit service with custom settings
    pub fn new_with_settings(settings: ServiceSettings) -> Self {
        Self {
            state: RateLimitState::new_with_settings(settings),
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
        let timestamp_ticks = self.state.settings.precision.to_ticks(duration);

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
    pub fn settings(&self) -> &ServiceSettings {
        &self.state.settings
    }

    /// Update service settings
    pub fn update_settings(&mut self, settings: ServiceSettings) {
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

impl<E> Default for RateLimitService<E>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
{
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::algorithm::types::RateLimitError;
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

    fn get_service() -> RateLimitService<TestIdentifier> {
        let mut service: RateLimitService<TestIdentifier> = RateLimitService::new();
        service
            .add_config(
                "test",
                RateLimitConfig {
                    capacity: 10,
                    window_size: 60,
                },
            )
            .unwrap();
        service
            .add_config(
                "create_action",
                RateLimitConfig {
                    capacity: 10,
                    window_size: 60,
                },
            )
            .unwrap();
        service
            .add_config(
                "add_token",
                RateLimitConfig {
                    capacity: 60,
                    window_size: 60,
                },
            )
            .unwrap();
        service
    }

    fn get_service_with_settings(settings: ServiceSettings) -> RateLimitService<TestIdentifier> {
        let mut service: RateLimitService<TestIdentifier> =
            RateLimitService::new_with_settings(settings);
        service
            .add_config(
                "test",
                RateLimitConfig {
                    capacity: 10,
                    window_size: 60,
                },
            )
            .unwrap();
        service
    }

    // ===== Constructor Tests =====

    #[test]
    fn test_new_service() {
        let service: RateLimitService<TestIdentifier> = RateLimitService::new();
        assert_eq!(service.state.method_configs.len(), 0);
        assert_eq!(service.state.runtime_limiters.len(), 0);
    }

    #[test]
    fn test_default_service() {
        let service: RateLimitService<TestIdentifier> = RateLimitService::default();
        assert_eq!(service.state.method_configs.len(), 0);
        assert_eq!(service.state.runtime_limiters.len(), 0);
    }

    // ===== Configuration Tests =====

    #[test]
    fn test_configured_methods() {
        let mut service: RateLimitService<TestIdentifier> = RateLimitService::new();

        service
            .add_config(
                "method1",
                RateLimitConfig {
                    capacity: 10,
                    window_size: 60,
                },
            )
            .unwrap();
        service
            .add_config(
                "method2",
                RateLimitConfig {
                    capacity: 20,
                    window_size: 120,
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
        let mut service: RateLimitService<TestIdentifier> = RateLimitService::new();
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
        let mut service: RateLimitService<TestIdentifier> = RateLimitService::new();

        let result = service.add_config(
            "test",
            RateLimitConfig {
                capacity: 0,
                window_size: 60,
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
        let mut service: RateLimitService<TestIdentifier> = RateLimitService::new();

        let result = service.add_config(
            "test",
            RateLimitConfig {
                capacity: 10,
                window_size: 0,
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
        let nanos_settings = ServiceSettings::with_precision(PrecisionType::Nanos);
        let mut service_nanos: RateLimitService<TestIdentifier> =
            RateLimitService::new_with_settings(nanos_settings);
        service_nanos
            .add_config(
                "test",
                RateLimitConfig {
                    capacity: 10,
                    window_size: 60,
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
        let millis_settings = ServiceSettings::with_precision(PrecisionType::Millis);
        let mut service_millis: RateLimitService<TestIdentifier> =
            RateLimitService::new_with_settings(millis_settings);
        service_millis
            .add_config(
                "test",
                RateLimitConfig {
                    capacity: 10,
                    window_size: 60,
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

    #[test]
    fn test_precision_settings() {
        // Test creating settings with different precisions
        let nanos_settings = ServiceSettings::with_precision(PrecisionType::Nanos);
        assert_eq!(nanos_settings.precision, PrecisionType::Nanos);
        assert_eq!(nanos_settings.delete_threshold_ticks, None);

        let millis_settings = ServiceSettings::with_precision(PrecisionType::Millis);
        assert_eq!(millis_settings.precision, PrecisionType::Millis);

        // Test combined settings
        let combined_settings =
            ServiceSettings::with_delete_threshold_and_precision(1000, PrecisionType::Micros);
        assert_eq!(combined_settings.precision, PrecisionType::Micros);
        assert_eq!(combined_settings.delete_threshold_ticks, Some(1000));
    }

    #[test]
    fn test_precision_conversion() {
        let duration = Duration::from_millis(1500);

        // Test different precision conversions
        assert_eq!(PrecisionType::Nanos.to_ticks(duration), 1_500_000_000);
        assert_eq!(PrecisionType::Micros.to_ticks(duration), 1_500_000);
        assert_eq!(PrecisionType::Millis.to_ticks(duration), 1_500);
        assert_eq!(PrecisionType::Secs.to_ticks(duration), 1);

        // Test round-trip conversion
        let ticks = PrecisionType::Millis.to_ticks(duration);
        let recovered = PrecisionType::Millis.from_ticks(ticks);
        assert_eq!(recovered, duration);
    }

    // ===== Timestamp and Settings Tests =====

    #[test]
    fn test_service_with_settings() {
        let settings = ServiceSettings::with_delete_threshold(3_600_000_000_000); // 1 hour in nanoseconds
        let service = get_service_with_settings(settings.clone());

        assert_eq!(
            service.settings().delete_threshold_ticks,
            Some(3_600_000_000_000)
        );
    }

    #[test]
    fn test_update_settings() {
        let mut service = get_service();
        let new_settings = ServiceSettings::with_delete_threshold(7_200_000_000_000); // 2 hours in nanoseconds

        service.update_settings(new_settings);
        assert_eq!(
            service.settings().delete_threshold_ticks,
            Some(7_200_000_000_000)
        );
    }

    #[test]
    fn test_get_stats() {
        let mut service = get_service();
        let duration = Duration::from_nanos(stable_base_time_ns());

        // Initially no counters
        let (count, oldest_created, oldest_updated) = service.get_stats();
        assert_eq!(count, 0);
        assert_eq!(oldest_created, None);
        assert_eq!(oldest_updated, None);

        // Create a counter
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration, 1)
                .is_ok()
        );

        let (count, oldest_created, oldest_updated) = service.get_stats();
        assert_eq!(count, 1);
        assert!(oldest_created.is_some());
        assert!(oldest_updated.is_some());
        assert_eq!(oldest_created, oldest_updated); // Should be equal for new counter
    }

    #[test]
    fn test_cleanup_old_counters() {
        let threshold = 60_000_000_000; // 60 seconds in nanoseconds
        let settings = ServiceSettings::with_delete_threshold(threshold);
        let mut service = get_service_with_settings(settings);

        let base_time = stable_base_time_ns();
        let old_duration = Duration::from_nanos(base_time);
        let new_duration = Duration::from_nanos(base_time + threshold + 1_000_000_000); // 1 second past threshold

        // Create a counter in the past
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", old_duration, 1)
                .is_ok()
        );

        let (count, _, _) = service.get_stats();
        assert_eq!(count, 1);

        // Use the service at a much later time, which should trigger cleanup
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", new_duration, 1)
                .is_ok()
        );

        let (count, _, _) = service.get_stats();
        assert_eq!(count, 1); // Only the new counter should remain
    }

    #[test]
    fn test_force_cleanup() {
        let mut service = get_service();
        let base_time = stable_base_time_ns();
        let old_duration = Duration::from_nanos(base_time);
        let threshold = 60_000_000_000; // 60 seconds in nanoseconds

        // Create multiple counters
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", old_duration, 1)
                .is_ok()
        );
        assert!(
            service
                .try_acquire_at(
                    TestIdentifier::UserPrincipal(Principal::from_text("2vxsx-fae").unwrap()),
                    "test",
                    old_duration,
                    1
                )
                .is_ok()
        );

        let (count, _, _) = service.get_stats();
        assert_eq!(count, 2);

        // Force cleanup of old counters
        let current_time = base_time + threshold + 1_000_000_000; // 1 second past threshold
        let removed_count = service.force_cleanup(current_time, threshold);

        assert_eq!(removed_count, 2); // Both counters should be removed

        let (count, _, _) = service.get_stats();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_counter_timestamps_update() {
        let mut service = get_service();
        let base_time = stable_base_time_ns();
        let duration1 = Duration::from_nanos(base_time);
        let duration2 = Duration::from_nanos(base_time + 30_000_000_000); // 30 seconds later

        // Create a counter
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration1, 1)
                .is_ok()
        );

        let (_, created, updated) = service.get_stats();
        let initial_created = created.unwrap();
        let initial_updated = updated.unwrap();

        // Use the counter again later
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", duration2, 1)
                .is_ok()
        );

        let (_, created, updated) = service.get_stats();
        let final_created = created.unwrap();
        let final_updated = updated.unwrap();

        // Created time should remain the same, updated time should change
        assert_eq!(initial_created, final_created);
        assert!(final_updated > initial_updated);
    }

    #[test]
    fn test_no_cleanup_without_threshold() {
        let mut service = get_service(); // Default settings with no cleanup threshold
        let base_time = stable_base_time_ns();
        let old_duration = Duration::from_nanos(base_time);
        let new_duration = Duration::from_nanos(base_time + 3_600_000_000_000); // 1 hour later

        // Create a counter in the past
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", old_duration, 1)
                .is_ok()
        );

        let (count, _, _) = service.get_stats();
        assert_eq!(count, 1);

        // Use the service much later - without threshold, no cleanup should happen
        assert!(
            service
                .try_acquire_at(TestIdentifier::AnyUser, "test", new_duration, 1)
                .is_ok()
        );

        let (count, _, _) = service.get_stats();
        assert_eq!(count, 1); // Counter should still exist
    }
}
