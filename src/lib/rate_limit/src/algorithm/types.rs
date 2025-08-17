/// The core trait implemented by all rate limiter algorithms.
///
/// This trait defines the essential operations available on any rate limiter,
/// supporting both simple and verbose (diagnostic) usage patterns.
pub trait RateLimitCore {
    type Config: Clone + Send + Sync + 'static;
    /// Attempts to acquire the specified number of tokens at the given tick (fast-path).
    ///
    /// Returns immediately with a minimal error type (`SimpleAcquireError`) for best performance.
    ///
    /// # Arguments
    /// * `tick` – Current time tick (from the application)
    /// * `tokens` – Number of tokens to acquire
    ///
    /// # Returns
    /// * `Ok(())` if the request is allowed
    /// * `Err(SimpleAcquireError)` if denied or failed
    fn try_acquire_at(&self, tick: u64, tokens: u64) -> RateLimitResult;

    /// Returns the number of tokens currently available at the given tick.
    ///
    /// # Arguments
    /// * `tick` – Current time tick (from the application)
    ///
    /// # Returns
    /// The number of tokens currently available for acquisition.
    fn capacity_remaining(&self, tick: u64) -> Result<u64, RateLimitError>;
    fn capacity_remaining_or_0(&self, tick: u64) -> u64 {
        self.capacity_remaining(tick).unwrap_or(0)
    }

    // create core from config (or however your algorithm initializes)
    fn new_from_config(cfg: &Self::Config) -> Self;

    // Validate the configuration.
    fn is_valid_config(cfg: &Self::Config) -> Result<(), RateLimitError>;
}

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

    #[error("Invalid configuration: {message}")]
    InvalidConfiguration { message: String },
}

/// Result type for rate limiting.
pub type RateLimitResult = Result<(), RateLimitError>;

/// Legacy alias for backwards compatibility
pub type VerboseRateLimitResult = RateLimitResult;
pub type VerboseRateLimitError = RateLimitError;
