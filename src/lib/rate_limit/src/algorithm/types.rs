/// Error type for rate limiting with diagnostic information.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum RateLimitError {
    /// Not enough tokens available.
    #[error(
        "Insufficient capacity: tried to acquire {acquiring}, available {available}, retry after {retry_after_ticks} tick(s)"
    )]
    InsufficientCapacity {
        acquiring: u64,
        available: u64,
        retry_after_ticks: u64,
    },
    /// Request permanently exceeds the configured capacity.
    #[error(
        "Request exceeds maximum capacity: tried to acquire {acquiring}, capacity {capacity}. This request cannot succeed"
    )]
    BeyondCapacity { acquiring: u64, capacity: u64 },
    /// Provided tick is too old.
    #[error("Expired tick: minimum acceptable tick is {min_acceptable_tick}")]
    ExpiredTick { min_acceptable_tick: u64 },
    /// Failed due to lock contention.
    #[error("Contention failure: resource is locked by another operation. Please retry")]
    ContentionFailure,

    #[error("Method '{method}' is not configured")]
    MethodNotConfigured { method: String },
}

/// Result type for rate limiting.
pub type RateLimitResult = Result<(), RateLimitError>;

/// Legacy alias for backwards compatibility
pub type VerboseRateLimitResult = RateLimitResult;
pub type VerboseRateLimitError = RateLimitError;
