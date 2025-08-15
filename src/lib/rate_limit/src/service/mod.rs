pub mod types;
pub use types::{LimiterEntry, RateLimitConfig, RateLimitState, ServiceError, ServiceSettings};

use ic_mple_utils::store::Storage;

use crate::{RateLimitError, algorithm::types::RateLimitCore, precision::Precision};

/// Rate limit service that manages rate limiting configurations and runtime limiters
/// RateLimitService generic parameters:
/// - I: Identifier type (e.g., user, principal) used for rate limiting, must be Eq, Hash, and Clone
/// - S: Storage backend implementing Storage for RateLimitState<I, P>
/// - P: Precision type (e.g., Nanos, Millis) for time calculations, must implement Precision
/// - R: Rate limiting algorithm core, must implement RateLimitCore (not used directly in struct, but required for trait bounds)
pub struct RateLimitService<I, S, P, R>
where
    I: std::cmp::Eq + std::hash::Hash + Clone, // Identifier type
    S: Storage<RateLimitState<I, P>>,          // Storage backend
    P: Precision,                              // Precision for time
    R: RateLimitCore,                          // Rate limiting algorithm core
{
    storage: S,
    _phantom: std::marker::PhantomData<I>,
    _phantom_precision: std::marker::PhantomData<P>,
    _phantom_core: std::marker::PhantomData<R>,
}

impl<I, S, P, R> RateLimitService<I, S, P, R>
where
    I: std::cmp::Eq + std::hash::Hash + Clone,
    S: Storage<RateLimitState<I, P>>,
    P: Precision + Clone,
    R: RateLimitCore,
{
    /// Creates a new RateLimitConfigService with the given storage
    pub fn new(storage: S) -> Self {
        Self {
            storage,
            _phantom: std::marker::PhantomData,
            _phantom_precision: std::marker::PhantomData,
            _phantom_core: std::marker::PhantomData,
        }
    }

    /// Initialize the rate limit service with settings
    pub fn init(&mut self, settings: ServiceSettings<P>) -> Result<(), ServiceError> {
        self.storage.with_borrow_mut(|state| {
            state.settings = settings;
            Ok(())
        })
    }

    /// Add a rate limit configuration for a method
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

        self.storage.with_borrow_mut(|state| {
            state.method_configs.insert(method.to_string(), config);
            Ok(())
        })
    }

    /// Try to acquire a single token
    pub fn try_acquire_one_at(
        &mut self,
        identifier: I,
        method: &str,
        duration: std::time::Duration,
    ) -> Result<(), RateLimitError> {
        self.storage.with_borrow_mut(|state| {
            let timestamp_ticks = P::to_ticks(duration);
            let key = (identifier.clone(), method.to_string());

            // If limiter doesn't exist, create it using the method's configuration
            if !state.runtime_limiters.contains_key(&key) {
                let config =
                    state
                        .method_configs
                        .get(method)
                        .ok_or(RateLimitError::BeyondCapacity {
                            acquiring: 1,
                            capacity: 0,
                        })?;

                let counter_config =
                    crate::algorithm::fixed_window_counter::FixedWindowCounterCoreConfig::new(
                        config.capacity,
                        config.window_size,
                    );
                let counter = crate::algorithm::fixed_window_counter::FixedWindowCounterCore::from(
                    counter_config,
                );
                let limiter = LimiterEntry::new(counter, timestamp_ticks);
                state.runtime_limiters.insert(key.clone(), limiter);
            }

            let limiter_entry = state.runtime_limiters.get_mut(&key).unwrap();
            limiter_entry.touch(timestamp_ticks);
            limiter_entry
                .counter_mut()
                .try_acquire_at(timestamp_ticks, 1)
        })
    }

    /// Try to acquire multiple tokens
    pub fn try_acquire_at(
        &mut self,
        identifier: I,
        method: &str,
        duration: std::time::Duration,
        tokens: u64,
    ) -> Result<(), RateLimitError> {
        self.storage.with_borrow_mut(|state| {
            let timestamp_ticks = P::to_ticks(duration);
            let key = (identifier.clone(), method.to_string());

            // If limiter doesn't exist, create it using the method's configuration
            if !state.runtime_limiters.contains_key(&key) {
                let config = state.method_configs.get(method).ok_or(
                    RateLimitError::MethodNotConfigured {
                        method: method.to_string(),
                    },
                )?;

                let counter_config =
                    crate::algorithm::fixed_window_counter::FixedWindowCounterCoreConfig::new(
                        config.capacity,
                        config.window_size,
                    );
                let counter = crate::algorithm::fixed_window_counter::FixedWindowCounterCore::from(
                    counter_config,
                );
                let timestamped_counter = LimiterEntry::new(counter, timestamp_ticks);
                state
                    .runtime_limiters
                    .insert(key.clone(), timestamped_counter);
            }

            let limiter_entry = state.runtime_limiters.get_mut(&key).unwrap();
            limiter_entry.touch(timestamp_ticks);
            limiter_entry
                .counter_mut()
                .try_acquire_at(timestamp_ticks, tokens)
        })
    }

    /// Get statistics about the current runtime limiters
    pub fn get_stats(&self) -> (usize, Option<u64>, Option<u64>) {
        self.storage.with_borrow(|state| {
            let total_counters = state.runtime_limiters.len();
            let oldest_created = state
                .runtime_limiters
                .values()
                .map(|counter| counter.created_time())
                .min();
            let oldest_updated = state
                .runtime_limiters
                .values()
                .map(|counter| counter.updated_time())
                .min();

            (total_counters, oldest_created, oldest_updated)
        })
    }

    /// Get all configured methods
    pub fn configured_methods(&self) -> Vec<String> {
        self.storage
            .with_borrow(|state| state.method_configs.keys().cloned().collect())
    }

    /// Force cleanup of old counters
    pub fn force_cleanup(&mut self, current_timestamp_ticks: u64, threshold_ticks: u64) -> usize {
        self.storage.with_borrow_mut(|state| {
            let initial_count = state.runtime_limiters.len();
            let cutoff_time = current_timestamp_ticks.saturating_sub(threshold_ticks);
            state
                .runtime_limiters
                .retain(|_, limiter_entry| limiter_entry.updated_time() > cutoff_time);
            initial_count.saturating_sub(state.runtime_limiters.len())
        })
    }

    pub fn settings(&self) -> ServiceSettings<P> {
        self.storage.with_borrow(|state| state.settings.clone())
    }

    /// Update service settings
    pub fn update_settings(&mut self, settings: ServiceSettings<P>) {
        self.storage.with_borrow_mut(|state| {
            state.settings = settings;
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        algorithm::{fixed_window_counter::FixedWindowCounterCore, types::RateLimitError},
        precision::{Millis, Nanos},
        test_utils::Time,
    };
    use candid::Principal;
    use std::{cell::RefCell, time::Duration};

    /// Test identifier enum demonstrating flexibility of the generic service
    #[derive(Debug, Clone, Hash, PartialEq, Eq)]
    pub enum TestIdentifier {
        /// Rate limiting per specific user principal
        UserPrincipal(Principal),
        /// Global rate limiting for any user
        AnyUser,
    }

    /// Simple owned storage implementation for testing
    struct OwnedStorage<T> {
        data: RefCell<T>,
    }

    impl<T> OwnedStorage<T> {
        fn new(data: T) -> Self {
            Self {
                data: RefCell::new(data),
            }
        }
    }

    impl<T> Storage<T> for OwnedStorage<T> {
        fn with_borrow<F, R>(&self, f: F) -> R
        where
            F: FnOnce(&T) -> R,
        {
            f(&self.data.borrow())
        }

        fn with_borrow_mut<F, R>(&mut self, f: F) -> R
        where
            F: FnOnce(&mut T) -> R,
        {
            f(&mut self.data.borrow_mut())
        }
    }

    /// Thread-local storage implementation for testing
    struct ThreadLocalStorage<T> {
        data: RefCell<T>,
    }

    impl<T> ThreadLocalStorage<T> {
        fn new(data: T) -> Self {
            Self {
                data: RefCell::new(data),
            }
        }
    }

    impl<T> Storage<T> for ThreadLocalStorage<T> {
        fn with_borrow<F, R>(&self, f: F) -> R
        where
            F: FnOnce(&T) -> R,
        {
            f(&self.data.borrow())
        }

        fn with_borrow_mut<F, R>(&mut self, f: F) -> R
        where
            F: FnOnce(&mut T) -> R,
        {
            f(&mut self.data.borrow_mut())
        }
    }

    fn get_settings() -> ServiceSettings<Nanos> {
        ServiceSettings::new(Duration::from_secs(60 * 60))
    }

    fn get_service() -> RateLimitService<
        TestIdentifier,
        OwnedStorage<RateLimitState<TestIdentifier, Nanos>>,
        Nanos,
        FixedWindowCounterCore,
    > {
        let mut state: RateLimitState<TestIdentifier, Nanos> = RateLimitState::new(get_settings());
        state.method_configs.insert(
            "test".to_string(),
            RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
        );
        state.method_configs.insert(
            "create_action".to_string(),
            RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
        );
        state.method_configs.insert(
            "add_token".to_string(),
            RateLimitConfig::new(60, Duration::from_secs(60 * 10)),
        );
        let storage = OwnedStorage::new(state);
        RateLimitService::new(storage)
    }

    // ===== Constructor Tests =====

    #[test]
    fn test_new_service() {
        // Arrange
        let delete_threshold = Duration::from_secs(3600); // 1 hour
        let settings = ServiceSettings::new(delete_threshold);
        let state: RateLimitState<TestIdentifier, Nanos> = RateLimitState::new(settings);
        let storage = OwnedStorage::new(state);

        // Act
        let service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Nanos>>,
            Nanos,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);

        // Assert
        let (count, _, _) = service.get_stats();
        assert_eq!(count, 0, "New service should have no runtime limiters");

        let methods = service.configured_methods();
        assert_eq!(
            methods.len(),
            0,
            "New service should have no method configurations"
        );

        let service_settings = service.settings();
        assert_eq!(
            service_settings.delete_threshold_ticks,
            Some(Nanos::to_ticks(delete_threshold)),
            "Service should have the correct delete threshold settings"
        );
    }

    #[test]
    fn test_new_service_with_zero_threshold() {
        // Arrange
        let zero_threshold = Duration::from_secs(0);
        let settings = ServiceSettings::new(zero_threshold);
        let state: RateLimitState<TestIdentifier, Nanos> = RateLimitState::new(settings);
        let storage = OwnedStorage::new(state);

        // Act
        let service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Nanos>>,
            Nanos,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
        // Assert
        let (count, _, _) = service.get_stats();
        assert_eq!(count, 0, "New service should have no runtime limiters");

        let methods = service.configured_methods();
        assert_eq!(
            methods.len(),
            0,
            "New service should have no method configurations"
        );

        let service_settings = service.settings();
        assert_eq!(
            service_settings.delete_threshold_ticks,
            Some(0),
            "Service should have zero delete threshold when created with zero duration"
        );
    }

    // ===== Configuration Tests =====

    #[test]
    fn test_configured_methods() {
        // Arrange
        let settings = ServiceSettings::new(Duration::from_secs(3600));
        let state: RateLimitState<TestIdentifier, Nanos> = RateLimitState::new(settings);
        let storage = OwnedStorage::new(state);
        let mut service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Nanos>>,
            Nanos,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
        let method1_config = RateLimitConfig::new(10, Duration::from_secs(60));
        let method2_config = RateLimitConfig::new(20, Duration::from_secs(120));

        // Act
        service.add_config("method1", method1_config).unwrap();
        service.add_config("method2", method2_config).unwrap();
        let methods = service.configured_methods();

        // Assert
        assert_eq!(
            methods.len(),
            2,
            "Service should have exactly 2 configured methods"
        );
        assert!(
            methods.contains(&"method1".to_string()),
            "Service should contain method1"
        );
        assert!(
            methods.contains(&"method2".to_string()),
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

        // Act - Acquire tokens for different identifiers
        let any_user_result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let principal_result = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );

        // Assert - Both initial acquisitions should succeed
        assert!(
            any_user_result.is_ok(),
            "AnyUser identifier should acquire tokens successfully"
        );
        assert!(
            principal_result.is_ok(),
            "UserPrincipal identifier should acquire tokens successfully"
        );

        // Act - Acquire additional tokens for each identifier
        let any_user_result2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let principal_result2 = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );

        // Assert - Each identifier should have its own capacity
        assert!(
            any_user_result2.is_ok(),
            "AnyUser identifier should have remaining capacity"
        );
        assert!(
            principal_result2.is_ok(),
            "UserPrincipal identifier should have remaining capacity"
        );
    }

    // ===== Multiple Methods Tests =====

    #[test]
    fn test_multiple_methods() {
        // Arrange
        let time = Time::init();
        let mut service = get_service();
        let duration = Duration::from_secs(time.now());

        // Act - Acquire tokens from different methods
        let test_result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let create_action_result =
            service.try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5);
        let add_token_result =
            service.try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30);

        // Assert - All initial acquisitions should succeed
        assert!(
            test_result.is_ok(),
            "Test method should acquire tokens successfully"
        );
        assert!(
            create_action_result.is_ok(),
            "Create action method should acquire tokens successfully"
        );
        assert!(
            add_token_result.is_ok(),
            "Add token method should acquire tokens successfully"
        );

        // Act - Acquire additional tokens from each method
        let test_result2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let create_action_result2 =
            service.try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5);
        let add_token_result2 =
            service.try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30);

        // Assert - Each method should have its own capacity and allow additional acquisitions
        assert!(
            test_result2.is_ok(),
            "Test method should have remaining capacity"
        );
        assert!(
            create_action_result2.is_ok(),
            "Create action method should have remaining capacity"
        );
        assert!(
            add_token_result2.is_ok(),
            "Add token method should have remaining capacity"
        );
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

        // Assert - Should return MethodNotConfigured error when method is not configured
        assert!(result.is_err(), "Should fail when method is not configured");
        match result {
            Err(RateLimitError::MethodNotConfigured { method }) => {
                assert_eq!(method, "nonexistent");
            }
            _ => panic!("Expected MethodNotConfigured error"),
        }
    }

    #[test]
    fn test_add_config_invalid_capacity() {
        // Arrange
        let state: RateLimitState<TestIdentifier, Nanos> = RateLimitState::new(get_settings());
        let storage = OwnedStorage::new(state);
        let mut service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Nanos>>,
            Nanos,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
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
        let state: RateLimitState<TestIdentifier, Nanos> = RateLimitState::new(get_settings());
        let storage = OwnedStorage::new(state);
        let mut service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Nanos>>,
            Nanos,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
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

    fn get_millis_service() -> RateLimitService<
        TestIdentifier,
        OwnedStorage<RateLimitState<TestIdentifier, Millis>>,
        Millis,
        FixedWindowCounterCore,
    > {
        let mut state: RateLimitState<TestIdentifier, Millis> =
            RateLimitState::new(ServiceSettings::new(Duration::from_secs(60 * 60)));
        state.method_configs.insert(
            "test".to_string(),
            RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
        );
        state.method_configs.insert(
            "create_action".to_string(),
            RateLimitConfig::new(10, Duration::from_secs(60 * 10)),
        );
        state.method_configs.insert(
            "add_token".to_string(),
            RateLimitConfig::new(60, Duration::from_secs(60 * 10)),
        );
        let storage = OwnedStorage::new(state);
        RateLimitService::new(storage)
    }

    #[test]
    fn test_millis_precision_new_service() {
        // Arrange
        let delete_threshold = Duration::from_secs(3600); // 1 hour
        let settings = ServiceSettings::new(delete_threshold);
        let state: RateLimitState<TestIdentifier, Millis> = RateLimitState::new(settings);
        let storage = OwnedStorage::new(state);

        // Act
        let service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Millis>>,
            Millis,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
        // Assert
        let (count, _, _) = service.get_stats();
        assert_eq!(
            count, 0,
            "New millis service should have no runtime limiters"
        );

        let methods = service.configured_methods();
        assert_eq!(
            methods.len(),
            0,
            "New millis service should have no method configurations"
        );

        let service_settings = service.settings();
        assert_eq!(
            service_settings.delete_threshold_ticks,
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

        // Act - Acquire tokens from different methods with millis precision
        let test_result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let create_action_result =
            service.try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5);
        let add_token_result =
            service.try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30);

        // Assert - All initial acquisitions should succeed
        assert!(
            test_result.is_ok(),
            "Millis precision test method should succeed"
        );
        assert!(
            create_action_result.is_ok(),
            "Millis precision create_action method should succeed"
        );
        assert!(
            add_token_result.is_ok(),
            "Millis precision add_token method should succeed"
        );

        // Act - Acquire additional tokens from each method
        let test_result2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let create_action_result2 =
            service.try_acquire_at(TestIdentifier::AnyUser, "create_action", duration, 5);
        let add_token_result2 =
            service.try_acquire_at(TestIdentifier::AnyUser, "add_token", duration, 30);

        // Assert - Each method should have its own capacity
        assert!(
            test_result2.is_ok(),
            "Millis precision test method should have remaining capacity"
        );
        assert!(
            create_action_result2.is_ok(),
            "Millis precision create_action method should have remaining capacity"
        );
        assert!(
            add_token_result2.is_ok(),
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

        // Act - Acquire tokens for different identifiers with millis precision
        let any_user_result = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let principal_result = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );

        // Assert - Both initial acquisitions should succeed
        assert!(
            any_user_result.is_ok(),
            "Millis precision AnyUser should succeed"
        );
        assert!(
            principal_result.is_ok(),
            "Millis precision UserPrincipal should succeed"
        );

        // Act - Acquire additional tokens for each identifier
        let any_user_result2 = service.try_acquire_at(TestIdentifier::AnyUser, "test", duration, 5);
        let principal_result2 = service.try_acquire_at(
            TestIdentifier::UserPrincipal(principal),
            "test",
            duration,
            5,
        );

        // Assert - Each identifier should have its own capacity
        assert!(
            any_user_result2.is_ok(),
            "Millis precision AnyUser should have remaining capacity"
        );
        assert!(
            principal_result2.is_ok(),
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
        let state: RateLimitState<TestIdentifier, Millis> = RateLimitState::new(settings);
        let storage = OwnedStorage::new(state);
        let mut service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Millis>>,
            Millis,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
        let method1_config = RateLimitConfig::new(10, Duration::from_secs(60));
        let method2_config = RateLimitConfig::new(20, Duration::from_secs(120));

        // Act
        service.add_config("method1", method1_config).unwrap();
        service.add_config("method2", method2_config).unwrap();
        let methods = service.configured_methods();

        // Assert
        assert_eq!(
            methods.len(),
            2,
            "Millis precision service should have exactly 2 configured methods"
        );
        assert!(
            methods.contains(&"method1".to_string()),
            "Millis precision service should contain method1"
        );
        assert!(
            methods.contains(&"method2".to_string()),
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

    // ===== Storage Abstraction Tests =====

    #[test]
    fn test_rate_limit_service_with_thread_local_storage() {
        // Arrange
        let setting: ServiceSettings<Millis> = ServiceSettings::new(Duration::from_secs(3600));
        let mut state: RateLimitState<TestIdentifier, Millis> = RateLimitState::new(setting);
        state.method_configs.insert(
            "test".to_string(),
            RateLimitConfig::new(10, Duration::from_secs(60)),
        );
        let storage: ThreadLocalStorage<RateLimitState<TestIdentifier, Millis>> =
            ThreadLocalStorage::new(state);
        let mut service: RateLimitService<
            TestIdentifier,
            ThreadLocalStorage<RateLimitState<TestIdentifier, Millis>>,
            Millis,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
        let duration = Duration::from_secs(1755082293); // Stable base time

        // Act - Add another config
        let add_result = service.add_config(
            "another_test",
            RateLimitConfig::new(5, Duration::from_secs(30)),
        );

        // Assert - Config addition should succeed
        assert!(add_result.is_ok());

        // Act - Acquire tokens
        let acquire_result = service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);

        // Assert - Token acquisition should succeed
        assert!(acquire_result.is_ok());

        // Act - Get stats
        let (count, _, _) = service.get_stats();

        // Assert - Should have one active limiter
        assert_eq!(count, 1);

        // Act - Get configured methods
        let methods = service.configured_methods();

        // Assert - Should have both configured methods
        assert_eq!(methods.len(), 2);
        assert!(methods.contains(&"test".to_string()));
        assert!(methods.contains(&"another_test".to_string()));
    }

    #[test]
    fn test_settings_management() {
        // Arrange
        let setting: ServiceSettings<Nanos> = ServiceSettings::new(Duration::from_secs(3600));
        let state: RateLimitState<TestIdentifier, Nanos> = RateLimitState::new(setting);
        let storage = OwnedStorage::new(state);
        let mut service: RateLimitService<
            TestIdentifier,
            OwnedStorage<RateLimitState<TestIdentifier, Nanos>>,
            Nanos,
            FixedWindowCounterCore,
        > = RateLimitService::new(storage);
        let initial_settings = ServiceSettings::new(Duration::from_secs(3600));
        let updated_settings = ServiceSettings::new(Duration::from_secs(1800));

        // Act - Initialize with settings
        let init_result = service.init(initial_settings.clone());

        // Assert - Initialization should succeed
        assert!(init_result.is_ok());

        // Act - Get current settings
        let current_settings = service.settings();

        // Assert - Settings should match initial settings
        assert_eq!(
            current_settings.delete_threshold_ticks,
            initial_settings.delete_threshold_ticks
        );

        // Act - Update settings
        service.update_settings(updated_settings.clone());

        // Act - Get updated settings
        let final_settings = service.settings();

        // Assert - Settings should be updated
        assert_eq!(
            final_settings.delete_threshold_ticks,
            updated_settings.delete_threshold_ticks
        );
    }
}
