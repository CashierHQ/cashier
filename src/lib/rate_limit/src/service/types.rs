use std::collections::HashMap;

/// Configuration for rate limiting a specific method
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum number of tokens that can be acquired in the time window
    pub capacity: u64,
    /// Time window size in ticks (depends on precision)
    pub window_size: u64,
}

impl RateLimitConfig {
    /// Create a new rate limit configuration
    pub fn new(capacity: u64, window_size: u64) -> Self {
        Self {
            capacity,
            window_size,
        }
    }
}

/// Service-wide settings for rate limiting
#[derive(Debug, Clone)]
pub struct ServiceSettings {
    /// Precision type for timestamp calculations
    pub precision: PrecisionType,
    /// Optional threshold for cleaning up old counters (in ticks)
    pub delete_threshold_ticks: Option<u64>,
}

impl ServiceSettings {
    /// Create settings with precision only
    pub fn with_precision(precision: PrecisionType) -> Self {
        Self {
            precision,
            delete_threshold_ticks: None,
        }
    }

    /// Create settings with delete threshold only
    pub fn with_delete_threshold(delete_threshold_ticks: u64) -> Self {
        Self {
            precision: PrecisionType::default(),
            delete_threshold_ticks: Some(delete_threshold_ticks),
        }
    }

    /// Create settings with both precision and delete threshold
    pub fn with_delete_threshold_and_precision(
        delete_threshold_ticks: u64,
        precision: PrecisionType,
    ) -> Self {
        Self {
            precision,
            delete_threshold_ticks: Some(delete_threshold_ticks),
        }
    }
}

impl Default for ServiceSettings {
    fn default() -> Self {
        Self {
            precision: PrecisionType::default(),
            delete_threshold_ticks: None,
        }
    }
}

/// Precision type for timestamp calculations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrecisionType {
    Nanos,
    Micros,
    Millis,
    Secs,
}

impl PrecisionType {
    /// Convert a Duration to ticks based on this precision
    pub fn to_ticks(&self, duration: std::time::Duration) -> u64 {
        match self {
            PrecisionType::Nanos => duration.as_nanos() as u64,
            PrecisionType::Micros => duration.as_micros() as u64,
            PrecisionType::Millis => duration.as_millis() as u64,
            PrecisionType::Secs => duration.as_secs(),
        }
    }

    /// Convert ticks back to Duration based on this precision
    pub fn from_ticks(&self, ticks: u64) -> std::time::Duration {
        match self {
            PrecisionType::Nanos => std::time::Duration::from_nanos(ticks),
            PrecisionType::Micros => std::time::Duration::from_micros(ticks),
            PrecisionType::Millis => std::time::Duration::from_millis(ticks),
            PrecisionType::Secs => std::time::Duration::from_secs(ticks),
        }
    }
}

impl Default for PrecisionType {
    fn default() -> Self {
        Self::Nanos
    }
}

/// Entry for a rate limiter with timestamp tracking
pub struct LimiterEntry {
    counter: crate::algorithm::fixed_window_counter::FixedWindowCounterCore,
    created_time: u64,
    updated_time: u64,
}

impl LimiterEntry {
    /// Create a new limiter entry
    pub fn new(
        counter: crate::algorithm::fixed_window_counter::FixedWindowCounterCore,
        timestamp_ticks: u64,
    ) -> Self {
        Self {
            counter,
            created_time: timestamp_ticks,
            updated_time: timestamp_ticks,
        }
    }

    /// Get a reference to the counter
    pub fn counter(&self) -> &crate::algorithm::fixed_window_counter::FixedWindowCounterCore {
        &self.counter
    }

    /// Get a mutable reference to the counter
    pub fn counter_mut(
        &mut self,
    ) -> &mut crate::algorithm::fixed_window_counter::FixedWindowCounterCore {
        &mut self.counter
    }

    /// Get the creation timestamp
    pub fn created_time(&self) -> u64 {
        self.created_time
    }

    /// Get the last update timestamp
    pub fn updated_time(&self) -> u64 {
        self.updated_time
    }

    /// Update the access timestamp
    pub fn touch(&mut self, timestamp_ticks: u64) {
        self.updated_time = timestamp_ticks;
    }
}

/// Service errors
#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Invalid configuration: {message}")]
    InvalidConfiguration { message: String },
    #[error("Method '{method}' is not configured")]
    MethodNotConfigured { method: String },
}

/// Grouped state for rate limiting service
/// This groups the three main components into a single struct for cleaner thread-local storage
pub struct RateLimitState<E>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
{
    /// Configuration for each method (set once during initialization)
    pub method_configs: HashMap<String, RateLimitConfig>,
    /// Runtime tracking for each (identifier, method) pair (created on-demand)
    pub runtime_limiters: HashMap<(E, String), LimiterEntry>,
    /// Service-wide settings
    pub settings: ServiceSettings,
}

impl<E> RateLimitState<E>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
{
    /// Create a new empty rate limit state with default settings
    pub fn new() -> Self {
        Self {
            method_configs: HashMap::new(),
            runtime_limiters: HashMap::new(),
            settings: ServiceSettings::default(),
        }
    }

    /// Create a new empty rate limit state with custom settings
    pub fn new_with_settings(settings: ServiceSettings) -> Self {
        Self {
            method_configs: HashMap::new(),
            runtime_limiters: HashMap::new(),
            settings,
        }
    }
}

impl<E> Default for RateLimitState<E>
where
    E: std::cmp::Eq + std::hash::Hash + Clone,
{
    fn default() -> Self {
        Self::new()
    }
}
