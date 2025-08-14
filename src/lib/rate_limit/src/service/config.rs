use crate::{RateLimitError, service::types::*};
use ic_mple_utils::store::Storage;

/// Configuration service that manages rate limiting using pluggable storage
/// This follows the same pattern as LoggerConfigService for consistency
pub struct RateLimitConfigService<E, S>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    S: Storage<RateLimitState<E>>,
{
    storage: S,
    _phantom: std::marker::PhantomData<E>,
}

impl<E, S> RateLimitConfigService<E, S>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
    S: Storage<RateLimitState<E>>,
{
    /// Creates a new RateLimitConfigService with the given storage
    pub fn new(storage: S) -> Self {
        Self {
            storage,
            _phantom: std::marker::PhantomData,
        }
    }

    /// Initialize the rate limit service with settings
    pub fn init(&mut self, settings: ServiceSettings) -> Result<(), ServiceError> {
        self.storage.with_borrow_mut(|state| {
            state.settings = settings;
            Ok(())
        })
    }

    /// Add a rate limit configuration for a method
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
            let timestamp_ticks = state.settings.precision.to_ticks(duration);
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
                let timestamped_counter = LimiterEntry::new(counter, timestamp_ticks);
                state
                    .runtime_limiters
                    .insert(key.clone(), timestamped_counter);
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
            let timestamp_ticks = state.settings.precision.to_ticks(duration);
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

    /// Get the current service settings
    pub fn settings(&self) -> ServiceSettings {
        self.storage.with_borrow(|state| state.settings.clone())
    }

    /// Update service settings
    pub fn update_settings(&mut self, settings: ServiceSettings) {
        self.storage.with_borrow_mut(|state| {
            state.settings = settings;
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use RateLimitError;
    use candid::Principal;

    #[derive(Debug, Clone, Hash, PartialEq, Eq)]
    pub enum TestIdentifier {
        UserPrincipal(Principal),
        AnyUser,
    }

    fn stable_base_time_ns() -> u64 {
        1755082293 * 1_000_000_000
    }

    #[test]
    fn test_rate_limit_config_service_with_owned_storage() {
        let mut state = RateLimitState::new();
        state.method_configs.insert(
            "test".to_string(),
            RateLimitConfig {
                capacity: 10,
                window_size: 60,
            },
        );

        let mut config_service = RateLimitConfigService::new(state);

        // Test adding config
        let result = config_service.add_config(
            "another_test",
            RateLimitConfig {
                capacity: 5,
                window_size: 30,
            },
        );
        assert!(result.is_ok());

        // Test acquiring tokens
        let duration = std::time::Duration::from_nanos(stable_base_time_ns());
        let result = config_service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);
        assert!(result.is_ok());

        // Test getting stats
        let (count, _, _) = config_service.get_stats();
        assert_eq!(count, 1);

        // Test getting configured methods
        let methods = config_service.configured_methods();
        assert_eq!(methods.len(), 2);
        assert!(methods.contains(&"test".to_string()));
        assert!(methods.contains(&"another_test".to_string()));
    }

    #[test]
    fn test_rate_limit_config_service_with_thread_local_storage() {
        use std::cell::RefCell;
        thread_local! {
            static TEST_STATE: RefCell<RateLimitState<TestIdentifier>> = RefCell::new({
                let mut state = RateLimitState::new();
                state.method_configs.insert("test".to_string(), RateLimitConfig { capacity: 10, window_size: 60 });
                state
            });
        }

        let mut config_service = RateLimitConfigService::new(&TEST_STATE);

        // Test acquiring tokens
        let duration = std::time::Duration::from_nanos(stable_base_time_ns());
        let result = config_service.try_acquire_one_at(TestIdentifier::AnyUser, "test", duration);
        assert!(result.is_ok());

        // Test getting stats
        let (count, _, _) = config_service.get_stats();
        assert_eq!(count, 1);
    }
}
