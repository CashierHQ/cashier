use crate::algorithm::fixed_window_counter::FixedWindowCounterCore;
use crate::percision::{Micros, Millis, Nanos, Precision, Secs};
use std::time::Duration;

/// Enum representing different precision types that can be used at runtime
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum PrecisionType {
    /// Nanosecond precision (1 tick = 1 nanosecond)
    #[default]
    Nanos,
    /// Microsecond precision (1 tick = 1 microsecond)
    Micros,
    /// Millisecond precision (1 tick = 1 millisecond)
    Millis,
    /// Second precision (1 tick = 1 second)
    Secs,
}

impl PrecisionType {
    /// Convert a Duration to ticks using this precision
    pub fn to_ticks(&self, duration: Duration) -> u64 {
        match self {
            PrecisionType::Nanos => Nanos::to_ticks(duration),
            PrecisionType::Micros => Micros::to_ticks(duration),
            PrecisionType::Millis => Millis::to_ticks(duration),
            PrecisionType::Secs => Secs::to_ticks(duration),
        }
    }

    /// Convert ticks back to Duration using this precision
    pub fn from_ticks(&self, ticks: u64) -> Duration {
        match self {
            PrecisionType::Nanos => Nanos::from_ticks(ticks),
            PrecisionType::Micros => Micros::from_ticks(ticks),
            PrecisionType::Millis => Millis::from_ticks(ticks),
            PrecisionType::Secs => Secs::from_ticks(ticks),
        }
    }
}

/// Configuration for a specific rate limiter
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum number of requests allowed per window
    pub capacity: u64,
    /// Duration of the rate limit window in ticks
    pub window_size: u64,
}

/// Service-wide settings for the rate limiter
#[derive(Debug, Clone)]
pub struct ServiceSettings {
    /// Threshold in ticks after which unused counters are eligible for deletion
    /// If None, counters are never automatically deleted
    pub delete_threshold_ticks: Option<u64>,
    /// Precision type used for time calculations
    pub precision: PrecisionType,
}

impl ServiceSettings {
    /// Create new service settings with default values
    pub fn new() -> Self {
        Self {
            delete_threshold_ticks: None,
            precision: PrecisionType::default(),
        }
    }

    /// Create service settings with a delete threshold
    pub fn with_delete_threshold(delete_threshold_ticks: u64) -> Self {
        Self {
            delete_threshold_ticks: Some(delete_threshold_ticks),
            precision: PrecisionType::default(),
        }
    }

    /// Create service settings with a specific precision
    pub fn with_precision(precision: PrecisionType) -> Self {
        Self {
            delete_threshold_ticks: None,
            precision,
        }
    }

    /// Create service settings with both delete threshold and precision
    pub fn with_delete_threshold_and_precision(
        delete_threshold_ticks: u64,
        precision: PrecisionType,
    ) -> Self {
        Self {
            delete_threshold_ticks: Some(delete_threshold_ticks),
            precision,
        }
    }
}

impl Default for ServiceSettings {
    fn default() -> Self {
        Self::new()
    }
}

/// Entry in the rate limiter service that tracks a counter with creation and update timestamps
pub struct LimiterEntry {
    /// The actual rate limiter counter
    counter: FixedWindowCounterCore,
    /// Timestamp when this counter was created (in ticks based on precision)
    created_time: u64,
    /// Timestamp when this counter was last updated (in ticks based on precision)
    updated_time: u64,
}

impl LimiterEntry {
    /// Create a new limiter entry
    pub fn new(counter: FixedWindowCounterCore, timestamp_ticks: u64) -> Self {
        Self {
            counter,
            created_time: timestamp_ticks,
            updated_time: timestamp_ticks,
        }
    }

    /// Update the last accessed timestamp
    pub fn touch(&mut self, timestamp_ticks: u64) {
        self.updated_time = timestamp_ticks;
    }

    /// Get the counter reference
    pub fn counter(&mut self) -> &mut FixedWindowCounterCore {
        &mut self.counter
    }

    /// Get creation time
    pub fn created_time(&self) -> u64 {
        self.created_time
    }

    /// Get last updated time
    pub fn updated_time(&self) -> u64 {
        self.updated_time
    }
}

impl RateLimitConfig {
    /// Create a new rate limit configuration
    pub fn new(capacity: u64, window_size_seconds: u64) -> Self {
        Self {
            capacity,
            window_size: window_size_seconds,
        }
    }
}

/// Errors that can occur in the rate limit service
#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    /// Method is not configured in the service
    #[error("Method '{method}' not configured. Call add_config() first.")]
    MethodNotConfigured {
        /// The method name that was not found
        method: String,
    },

    /// Invalid configuration provided
    #[error("Invalid configuration: {message}")]
    InvalidConfiguration {
        /// Description of the configuration error
        message: String,
    },
}
