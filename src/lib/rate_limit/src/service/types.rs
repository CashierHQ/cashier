/// Configuration for a specific rate limiter
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum number of requests allowed per window
    pub capacity: u64,
    /// Duration of the rate limit window in seconds
    pub window_size_seconds: u64,
}

impl RateLimitConfig {
    /// Create a new rate limit configuration
    pub fn new(capacity: u64, window_size_seconds: u64) -> Self {
        Self {
            capacity,
            window_size_seconds,
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
