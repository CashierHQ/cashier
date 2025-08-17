use std::{collections::HashMap, time::Duration};

use crate::{algorithm::types::RateLimitCore, precision::Precision};

/// Service-wide settings for rate limiting
#[derive(Debug, Default, Clone)]
pub struct ServiceSettings<P: Precision> {
    /// Optional threshold for cleaning up old counters (in ticks)
    pub delete_threshold_ticks: Option<u64>,
    // Phantom data to ensure that the precision is the same for all methods
    _phantom: std::marker::PhantomData<P>,
}

impl<P: Precision> ServiceSettings<P> {
    pub fn new(delete_threshold_ticks: Duration) -> Self {
        let threshold_ticks = P::to_ticks(delete_threshold_ticks);
        Self {
            delete_threshold_ticks: Some(threshold_ticks),
            _phantom: std::marker::PhantomData,
        }
    }
}

/// Entry in the rate limiting state for a specific method and identifier
/// R: The core rate limiting algorithm implementation (must implement `RateLimitCore`)
pub struct LimiterEntry<R>
where
    R: RateLimitCore,
{
    counter: R,
    created_time: u64,
    updated_time: u64,
}

impl<R: RateLimitCore> LimiterEntry<R> {
    /// Create a new limiter entry
    pub fn new(counter: R, timestamp_ticks: u64) -> Self {
        Self {
            counter,
            created_time: timestamp_ticks,
            updated_time: timestamp_ticks,
        }
    }

    /// Get a reference to the counter
    pub fn counter(&self) -> &R {
        &self.counter
    }

    /// Get a mutable reference to the counter
    pub fn counter_mut(&mut self) -> &mut R {
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
/// R: The core rate limiting algorithm implementation (must implement `RateLimitCore`)
/// I: The identifier type for entities being rate limited (e.g., user ID, IP address)
/// P: The precision type for time calculations (must implement `Precision`)
pub struct RateLimitState<R, I, P>
where
    R: RateLimitCore,
    I: std::cmp::Eq + std::hash::Hash + Clone,
    P: Precision,
{
    /// Configuration for each method (set once during initialization)
    pub method_configs: HashMap<String, R::Config>,
    /// Runtime tracking for each (identifier, method) pair (created on-demand)
    pub runtime_limiters: HashMap<(I, String), LimiterEntry<R>>,
    /// Service-wide settings
    pub settings: ServiceSettings<P>,
}

impl<R, I, P> RateLimitState<R, I, P>
where
    R: RateLimitCore,
    I: std::cmp::Eq + std::hash::Hash + Clone,
    P: Precision,
{
    /// Create a new empty rate limit state with custom settings
    pub fn new(settings: ServiceSettings<P>) -> Self {
        Self {
            method_configs: HashMap::new(),
            runtime_limiters: HashMap::new(),
            settings,
        }
    }
}
