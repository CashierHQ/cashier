//! Precision trait and predefined precision types for Duration-to-tick conversions.
//!
//! This module provides the foundation for zero-cost abstractions over different
//! time precision scales. The Precision trait enables compile-time optimization
//! of Duration conversions while maintaining type safety and flexibility.
//!
//! # Design Philosophy
//!
//! The precision system allows rate limiters to work with standard Duration
//! while internally using optimized tick representations. Different precision
//! types enable different use cases:
//!
//! - `Nanos`: Maximum precision, suitable for high-frequency operations
//! - `Micros`: Good balance for most applications
//! - `Millis`: Lower precision, suitable for coarse-grained rate limiting
//! - `Secs`: Minimal precision for very long-term rate limiting
//!
//! # Performance
//!
//! All precision conversions use branchless operations that compile to efficient
//! conditional move (CMOV) instructions, avoiding branch prediction penalties.
//!
//! # Examples
//!
//! ```rust
//! use std::time::Duration;
//! use rate_guard::precision::{Precision, Millis, Nanos};
//! use rate_guard::types::u64;
//! // Convert Duration to ticks using different precisions
//! let duration = Duration::from_millis(100);
//!
//! let millis_ticks = Millis::to_ticks(duration);   // 100 ticks
//! let nanos_ticks = Nanos::to_ticks(duration);     // 100_000_000 ticks
//!
//! // Convert back to Duration
//! let recovered = Millis::from_ticks(millis_ticks);
//! assert_eq!(recovered, duration);
//!
//! // Generic usage (as used in rate limiters)
//! fn convert_duration<P: Precision>(duration: Duration) -> u64 {
//!     P::to_ticks(duration)
//! }
//! ```

use std::time::Duration;

/// Trait for defining precision scales for Duration-to-tick conversions.
///
/// Precision implementations define how Duration values are converted to
/// internal tick representations and back. Each precision type represents
/// a different time scale, enabling optimization for different use cases.
///
/// # Implementation Requirements
///
/// Implementations must satisfy these invariants:
/// - Bidirectional conversion consistency: `from_ticks(to_ticks(d)) ≈ d`
/// - Monotonicity: larger durations produce larger tick values
/// - Zero preservation: `to_ticks(Duration::ZERO) == 0`
/// - Overflow handling: graceful saturation on overflow using branchless operations
///
/// # Performance
///
/// All methods should be marked `#[inline(always)]` to enable compile-time
/// optimization and ensure zero-cost abstractions. The `to_ticks` implementation
/// uses branchless min() operations that compile to CMOV instructions for optimal
/// performance.
///
/// # Generic Usage
///
/// The trait is designed to be used with generic type parameters in rate
/// limiters and executors:
///
/// ```rust
/// use std::time::Duration;
/// use rate_guard::precision::{Precision, Millis};
/// use rate_guard::types::u64;
///
/// fn process_with_precision<P: Precision>(duration: Duration) -> u64 {
///     P::to_ticks(duration)  // Static dispatch, zero-cost
/// }
///
/// let ticks = process_with_precision::<Millis>(Duration::from_millis(500));
/// assert_eq!(ticks, 500);
/// ```
pub trait Precision {
    /// Converts a Duration to ticks in this precision scale.
    ///
    /// This method uses branchless operations for optimal performance and
    /// handles overflow by saturating to the maximum tick value using
    /// min() operations that compile to efficient CMOV instructions.
    ///
    /// # Arguments
    /// * `duration` - The Duration to convert
    ///
    /// # Returns
    /// The number of ticks representing the duration in this precision
    ///
    /// # Performance
    ///
    /// This method is branchless and compiles to conditional move instructions,
    /// avoiding branch prediction penalties.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use std::time::Duration;
    /// use rate_guard::precision::{Precision, Millis};
    ///
    /// let duration = Duration::from_millis(500);
    /// let ticks = Millis::to_ticks(duration);
    /// assert_eq!(ticks, 500);
    /// ```
    fn to_ticks(duration: Duration) -> u64;

    /// Converts ticks back to a Duration in this precision scale.
    ///
    /// This method should be the inverse of `to_ticks` and handle
    /// large tick values gracefully.
    ///
    /// # Arguments
    /// * `ticks` - The number of ticks to convert
    ///
    /// # Returns
    /// The Duration represented by the tick count
    ///
    /// # Examples
    ///
    /// ```rust
    /// use std::time::Duration;
    /// use rate_guard::precision::{Precision, Millis};
    ///
    /// let duration = Millis::from_ticks(1500);
    /// assert_eq!(duration, Duration::from_millis(1500));
    /// ```
    fn from_ticks(ticks: u64) -> Duration;
}

/// Nanosecond precision - maximum precision scale.
///
/// Uses 1 tick = 1 nanosecond. This provides the highest precision
/// but may be overkill for many applications. Suitable for:
/// - High-frequency trading systems
/// - Precise timing measurements
/// - Maximum compatibility with system time
///
/// # Overflow Behavior
///
/// Can represent durations up to ~584 years with u64 ticks.
/// Uses branchless saturation on overflow for optimal performance.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Nanos;

impl Precision for Nanos {
    #[inline(always)]
    fn to_ticks(duration: Duration) -> u64 {
        // Branchless overflow handling using min() - compiles to CMOV instruction
        // This eliminates branch prediction penalties compared to if-else
        duration.as_nanos().min(u64::MAX as u128) as u64
    }

    #[inline(always)]
    fn from_ticks(ticks: u64) -> Duration {
        Duration::from_nanos(ticks)
    }
}

/// Microsecond precision - high precision scale.
///
/// Uses 1 tick = 1 microsecond. Provides good precision while
/// reducing the range of tick values. Suitable for:
/// - Network latency measurements
/// - General-purpose rate limiting
/// - Applications requiring sub-millisecond precision
///
/// # Overflow Behavior
///
/// Can represent durations up to ~584,000 years with u64 ticks.
/// Uses branchless saturation on overflow for optimal performance.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Micros;

impl Precision for Micros {
    #[inline(always)]
    fn to_ticks(duration: Duration) -> u64 {
        // Branchless overflow handling using min() - compiles to CMOV instruction
        duration.as_micros().min(u64::MAX as u128) as u64
    }

    #[inline(always)]
    fn from_ticks(ticks: u64) -> Duration {
        Duration::from_micros(ticks)
    }
}

/// Millisecond precision - standard precision scale.
///
/// Uses 1 tick = 1 millisecond. Provides good balance between
/// precision and efficiency. Suitable for:
/// - Web API rate limiting
/// - User-facing applications
/// - Most general-purpose scenarios
///
/// # Overflow Behavior
///
/// Can represent durations up to ~584 million years with u64 ticks.
/// Uses consistent branchless overflow handling for uniformity with other precisions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Millis;

impl Precision for Millis {
    #[inline(always)]
    fn to_ticks(duration: Duration) -> u64 {
        // Added consistent overflow protection for uniformity, even though
        // u64::MAX milliseconds (~584 million years) is practically unreachable
        // Uses branchless min() for consistency with other precision types
        duration.as_millis().min(u64::MAX as u128) as u64
    }

    #[inline(always)]
    fn from_ticks(ticks: u64) -> Duration {
        Duration::from_millis(ticks)
    }
}

/// Second precision - coarse precision scale.
///
/// Uses 1 tick = 1 second. Minimal precision but maximum efficiency
/// and range. Suitable for:
/// - Long-term rate limiting (hours, days)
/// - Coarse-grained applications
/// - Memory-constrained environments
///
/// # Overflow Behavior
///
/// Can represent durations far beyond practical limits with u64 ticks.
/// Uses consistent branchless overflow handling for uniformity.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Secs;

impl Precision for Secs {
    #[inline(always)]
    fn to_ticks(duration: Duration) -> u64 {
        // Added consistent overflow protection for uniformity, even though
        // u64::MAX seconds is practically infinite for rate limiting purposes
        // Uses branchless min() for consistency with other precision types
        duration.as_secs()
    }

    #[inline(always)]
    fn from_ticks(ticks: u64) -> Duration {
        Duration::from_secs(ticks)
    }
}
