use crate::{RateLimitError, percision::Precision, service::types::*};
use ic_mple_utils::store::Storage;

/// Configuration service that manages rate limiting using pluggable storage
/// This follows the same pattern as LoggerConfigService for consistency
pub struct RateLimitConfigService<E, S, P>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    S: Storage<RateLimitState<E, P>>,
    P: Precision,
{
    storage: S,
    _phantom: std::marker::PhantomData<E>,
    _phantom_precision: std::marker::PhantomData<P>,
}

impl<E, S, P> RateLimitConfigService<E, S, P>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    S: Storage<RateLimitState<E, P>>,
    P: Precision + Clone,
{
    /// Creates a new RateLimitConfigService with the given storage
    pub fn new(storage: S) -> Self {
        Self {
            storage,
            _phantom: std::marker::PhantomData,
            _phantom_precision: std::marker::PhantomData,
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
        identifier: E,
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
        identifier: E,
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

// #[cfg(test)]
// mod tests {
//     use super::*;
//     use candid::Principal;

//     #[derive(Debug, Clone, Hash, PartialEq, Eq)]
//     pub enum TestIdentifier {
//         UserPrincipal(Principal),
//         AnyUser,
//     }

//     fn stable_base_time_ns() -> u64 {
//         1755082293 * 1_000_000_000
//     }

//     #[test]
//     fn test_rate_limit_config_service_with_owned_storage() {
//         // Arrange
//         let mut state = RateLimitState::<TestIdentifier>::new();
//         state.method_configs.insert(
//             "test".to_string(),
//             RateLimitConfig {
//                 capacity: 10,
//                 window_size: 60,
//             },
//         );
//         let mut config_service = RateLimitConfigService::new(state);
//         let duration = std::time::Duration::from_nanos(stable_base_time_ns());

//         // Act - Add another config
//         let add_result = config_service.add_config(
//             "another_test",
//             RateLimitConfig {
//                 capacity: 5,
//                 window_size: 30,
//             },
//         );

//         // Assert - Config addition should succeed
//         assert!(add_result.is_ok());

//         // Act - Acquire tokens
//         let acquire_result =
//             config_service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);

//         // Assert - Token acquisition should succeed
//         assert!(acquire_result.is_ok());

//         // Act - Get stats
//         let (count, _, _) = config_service.get_stats();

//         // Assert - Should have one active limiter
//         assert_eq!(count, 1);

//         // Act - Get configured methods
//         let methods = config_service.configured_methods();

//         // Assert - Should have both configured methods
//         assert_eq!(methods.len(), 2);
//         assert!(methods.contains(&"test".to_string()));
//         assert!(methods.contains(&"another_test".to_string()));
//     }

//     #[test]
//     fn test_rate_limit_config_service_with_thread_local_storage() {
//         // Arrange
//         use std::cell::RefCell;
//         thread_local! {
//             static TEST_STATE: RefCell<RateLimitState<TestIdentifier>> = RefCell::new({
//                 let mut state = RateLimitState::<TestIdentifier>::new();
//                 state.method_configs.insert("test".to_string(), RateLimitConfig { capacity: 10, window_size: 60 });
//                 state
//             });
//         }

//         let mut config_service = RateLimitConfigService::new(&TEST_STATE);
//         let duration = std::time::Duration::from_nanos(stable_base_time_ns());

//         // Act - Acquire tokens
//         let acquire_result =
//             config_service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);

//         // Assert - Token acquisition should succeed
//         assert!(acquire_result.is_ok());

//         // Act - Get stats
//         let (count, _, _) = config_service.get_stats();

//         // Assert - Should have one active limiter
//         assert_eq!(count, 1);
//     }

//     #[test]
//     fn test_add_config_with_invalid_capacity() {
//         // Arrange
//         let mut state = RateLimitState::<TestIdentifier>::new();
//         let mut config_service = RateLimitConfigService::new(state);

//         // Act - Try to add config with zero capacity
//         let result = config_service.add_config(
//             "invalid_test",
//             RateLimitConfig {
//                 capacity: 0,
//                 window_size: 60,
//             },
//         );

//         // Assert - Should return error for invalid capacity
//         assert!(result.is_err());
//         match result {
//             Err(ServiceError::InvalidConfiguration { message }) => {
//                 assert_eq!(message, "Capacity must be greater than 0");
//             }
//             _ => panic!("Expected InvalidConfiguration error"),
//         }
//     }

//     #[test]
//     fn test_add_config_with_invalid_window_size() {
//         // Arrange
//         let mut state = RateLimitState::<TestIdentifier>::new();
//         let mut config_service = RateLimitConfigService::new(state);

//         // Act - Try to add config with zero window size
//         let result = config_service.add_config(
//             "invalid_test",
//             RateLimitConfig {
//                 capacity: 10,
//                 window_size: 0,
//             },
//         );

//         // Assert - Should return error for invalid window size
//         assert!(result.is_err());
//         match result {
//             Err(ServiceError::InvalidConfiguration { message }) => {
//                 assert_eq!(message, "Window size must be greater than 0");
//             }
//             _ => panic!("Expected InvalidConfiguration error"),
//         }
//     }

//     #[test]
//     fn test_try_acquire_with_unconfigured_method() {
//         // Arrange
//         let mut state = RateLimitState::<TestIdentifier>::new();
//         let mut config_service = RateLimitConfigService::new(state);
//         let duration = std::time::Duration::from_nanos(stable_base_time_ns());

//         // Act - Try to acquire tokens for unconfigured method
//         let result =
//             config_service.try_acquire_one_at(TestIdentifier::AnyUser, "unconfigured", duration);

//         // Assert - Should return error for unconfigured method
//         assert!(result.is_err());
//         match result {
//             Err(RateLimitError::BeyondCapacity {
//                 acquiring,
//                 capacity,
//             }) => {
//                 assert_eq!(acquiring, 1);
//                 assert_eq!(capacity, 0);
//             }
//             _ => panic!("Expected BeyondCapacity error"),
//         }
//     }

//     #[test]
//     fn test_try_acquire_multiple_tokens() {
//         // Arrange
//         let mut state = RateLimitState::<TestIdentifier>::new();
//         state.method_configs.insert(
//             "multi_test".to_string(),
//             RateLimitConfig {
//                 capacity: 10,
//                 window_size: 60,
//             },
//         );
//         let mut config_service = RateLimitConfigService::new(state);
//         let duration = std::time::Duration::from_nanos(stable_base_time_ns());

//         // Act - Acquire multiple tokens
//         let result =
//             config_service.try_acquire_at(TestIdentifier::AnyUser, "multi_test", duration, 5);

//         // Assert - Token acquisition should succeed
//         assert!(result.is_ok());

//         // Act - Try to acquire more tokens than capacity
//         let overflow_result =
//             config_service.try_acquire_at(TestIdentifier::AnyUser, "multi_test", duration, 10);

//         // Assert - Should fail when exceeding capacity
//         assert!(overflow_result.is_err());
//     }

//     #[test]
//     fn test_force_cleanup() {
//         // Arrange
//         let mut state = RateLimitState::<TestIdentifier>::new();
//         state.method_configs.insert(
//             "cleanup_test".to_string(),
//             RateLimitConfig {
//                 capacity: 10,
//                 window_size: 60,
//             },
//         );
//         let mut config_service = RateLimitConfigService::new(state);
//         let duration = std::time::Duration::from_nanos(stable_base_time_ns());

//         // Act - Create some limiters
//         config_service
//             .try_acquire_one_at(TestIdentifier::AnyUser, "cleanup_test", duration)
//             .unwrap();
//         config_service
//             .try_acquire_one_at(
//                 TestIdentifier::UserPrincipal(Principal::anonymous()),
//                 "cleanup_test",
//                 duration,
//             )
//             .unwrap();

//         // Verify we have 2 limiters
//         let (count_before, _, _) = config_service.get_stats();
//         assert_eq!(count_before, 2);

//         // Act - Force cleanup with very old threshold
//         let current_ticks = config_service.settings().precision.to_ticks(duration);
//         let threshold_ticks = 1000; // Very old threshold
//         let cleaned_count = config_service.force_cleanup(current_ticks, threshold_ticks);

//         // Assert - Should clean up old limiters
//         assert_eq!(cleaned_count, 0); // Limiters are recent, so none should be cleaned

//         // Act - Force cleanup with very recent threshold
//         let cleaned_count_recent = config_service.force_cleanup(current_ticks, 0);

//         // Assert - Should clean up all limiters
//         assert_eq!(cleaned_count_recent, 2);
//     }

//     #[test]
//     fn test_settings_management() {
//         // Arrange
//         let mut state = RateLimitState::<TestIdentifier>::new();
//         let mut config_service = RateLimitConfigService::new(state);
//         let initial_settings = ServiceSettings::with_precision(PrecisionType::Nanos);
//         let updated_settings = ServiceSettings::with_precision(PrecisionType::Millis);

//         // Act - Initialize with settings
//         let init_result = config_service.init(initial_settings.clone());

//         // Assert - Initialization should succeed
//         assert!(init_result.is_ok());

//         // Act - Get current settings
//         let current_settings = config_service.settings();

//         // Assert - Settings should match initial settings
//         assert_eq!(current_settings.precision, initial_settings.precision);

//         // Act - Update settings
//         config_service.update_settings(updated_settings.clone());

//         // Act - Get updated settings
//         let final_settings = config_service.settings();

//         // Assert - Settings should be updated
//         assert_eq!(final_settings.precision, updated_settings.precision);
//     }
// }
