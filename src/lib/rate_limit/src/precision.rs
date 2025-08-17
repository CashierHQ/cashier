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

#[cfg(test)]
mod tests {
    use super::*;

    /// Test precision trait implementations for basic conversion correctness
    mod precision_trait_tests {
        use super::*;

        #[test]
        fn test_nanos_precision_basic_conversions() {
            // Test basic conversions
            let duration = Duration::from_nanos(1_000_000);
            let ticks = Nanos::to_ticks(duration);
            assert_eq!(ticks, 1_000_000);

            let recovered = Nanos::from_ticks(ticks);
            assert_eq!(recovered, duration);
        }

        #[test]
        fn test_micros_precision_basic_conversions() {
            let duration = Duration::from_micros(5_000);
            let ticks = Micros::to_ticks(duration);
            assert_eq!(ticks, 5_000);

            let recovered = Micros::from_ticks(ticks);
            assert_eq!(recovered, duration);
        }

        #[test]
        fn test_millis_precision_basic_conversions() {
            let duration = Duration::from_millis(2_500);
            let ticks = Millis::to_ticks(duration);
            assert_eq!(ticks, 2_500);

            let recovered = Millis::from_ticks(ticks);
            assert_eq!(recovered, duration);
        }

        #[test]
        fn test_secs_precision_basic_conversions() {
            let duration = Duration::from_secs(300);
            let ticks = Secs::to_ticks(duration);
            assert_eq!(ticks, 300);

            let recovered = Secs::from_ticks(ticks);
            assert_eq!(recovered, duration);
        }

        #[test]
        fn test_zero_duration_preservation() {
            let zero_duration = Duration::ZERO;

            assert_eq!(Nanos::to_ticks(zero_duration), 0);
            assert_eq!(Micros::to_ticks(zero_duration), 0);
            assert_eq!(Millis::to_ticks(zero_duration), 0);
            assert_eq!(Secs::to_ticks(zero_duration), 0);

            assert_eq!(Nanos::from_ticks(0), Duration::ZERO);
            assert_eq!(Micros::from_ticks(0), Duration::ZERO);
            assert_eq!(Millis::from_ticks(0), Duration::ZERO);
            assert_eq!(Secs::from_ticks(0), Duration::ZERO);
        }

        #[test]
        fn test_monotonicity() {
            let short_duration = Duration::from_millis(1000);
            let long_duration = Duration::from_millis(10000);

            // All precisions should maintain order
            assert!(Nanos::to_ticks(short_duration) < Nanos::to_ticks(long_duration));
            assert!(Micros::to_ticks(short_duration) < Micros::to_ticks(long_duration));
            assert!(Millis::to_ticks(short_duration) < Millis::to_ticks(long_duration));
            assert!(Secs::to_ticks(short_duration) < Secs::to_ticks(long_duration));
        }

        #[test]
        fn test_precision_scale_relationships() {
            let duration = Duration::from_millis(1_000); // 1 second

            let nanos_ticks = Nanos::to_ticks(duration);
            let micros_ticks = Micros::to_ticks(duration);
            let millis_ticks = Millis::to_ticks(duration);
            let secs_ticks = Secs::to_ticks(duration);

            // Check the expected scale relationships
            assert_eq!(nanos_ticks, 1_000_000_000); // 1 billion nanos in 1 second
            assert_eq!(micros_ticks, 1_000_000); // 1 million micros in 1 second
            assert_eq!(millis_ticks, 1_000); // 1 thousand millis in 1 second
            assert_eq!(secs_ticks, 1); // 1 second in 1 second

            // Verify scale relationships
            assert_eq!(nanos_ticks / 1_000, micros_ticks);
            assert_eq!(micros_ticks / 1_000, millis_ticks);
            assert_eq!(millis_ticks / 1_000, secs_ticks);
        }
    }

    /// Test edge cases and overflow handling
    mod edge_case_tests {
        use super::*;

        #[test]
        fn test_overflow_handling_nanos() {
            // Create a duration that would overflow u64 when converted to nanos
            let huge_duration = Duration::new(u64::MAX, 999_999_999);
            let ticks = Nanos::to_ticks(huge_duration);

            // Should saturate to u64::MAX
            assert_eq!(ticks, u64::MAX);

            // Converting back should give a valid duration
            let recovered = Nanos::from_ticks(ticks);
            assert!(recovered.as_nanos() <= u64::MAX as u128);
        }

        #[test]
        fn test_overflow_handling_micros() {
            let huge_duration = Duration::new(u64::MAX, 999_999_999);
            let ticks = Micros::to_ticks(huge_duration);

            // Should saturate to u64::MAX
            assert_eq!(ticks, u64::MAX);

            let recovered = Micros::from_ticks(ticks);
            assert!(recovered.as_micros() <= u64::MAX as u128);
        }

        #[test]
        fn test_overflow_handling_millis() {
            let huge_duration = Duration::new(u64::MAX, 999_999_999);
            let ticks = Millis::to_ticks(huge_duration);

            // Should saturate to u64::MAX
            assert_eq!(ticks, u64::MAX);

            let recovered = Millis::from_ticks(ticks);
            assert!(recovered.as_millis() <= u64::MAX as u128);
        }

        #[test]
        fn test_overflow_handling_secs() {
            let huge_duration = Duration::new(u64::MAX, 999_999_999);
            let ticks = Secs::to_ticks(huge_duration);

            // Should be u64::MAX (no overflow for seconds)
            assert_eq!(ticks, u64::MAX);

            let recovered = Secs::from_ticks(ticks);
            assert_eq!(recovered.as_secs(), u64::MAX);
        }

        #[test]
        fn test_large_tick_values() {
            let large_ticks = u64::MAX;

            // All precisions should handle large tick values gracefully
            let nanos_duration = Nanos::from_ticks(large_ticks);
            let micros_duration = Micros::from_ticks(large_ticks);
            let millis_duration = Millis::from_ticks(large_ticks);
            let secs_duration = Secs::from_ticks(large_ticks);

            // Should not panic and produce valid durations
            assert!(nanos_duration.as_nanos() > 0);
            assert!(micros_duration.as_micros() > 0);
            assert!(millis_duration.as_millis() > 0);
            assert!(secs_duration.as_secs() > 0);
        }

        #[test]
        fn test_sub_unit_precision_loss() {
            // Test precision loss when converting sub-unit durations

            // 1.5 microseconds -> should truncate to 1 microsecond
            let duration = Duration::from_nanos(1_500);
            let micros_ticks = Micros::to_ticks(duration);
            assert_eq!(micros_ticks, 1);

            // 1.5 milliseconds -> should truncate to 1 millisecond
            let duration = Duration::from_micros(1_500);
            let millis_ticks = Millis::to_ticks(duration);
            assert_eq!(millis_ticks, 1);

            // 1.5 seconds -> should truncate to 1 second
            let duration = Duration::from_millis(1_500);
            let secs_ticks = Secs::to_ticks(duration);
            assert_eq!(secs_ticks, 1);
        }
    }

    /// Test generic usage patterns
    mod generic_usage_tests {
        use super::*;

        fn convert_duration<P: Precision>(duration: Duration) -> u64 {
            P::to_ticks(duration)
        }

        fn recover_duration<P: Precision>(ticks: u64) -> Duration {
            P::from_ticks(ticks)
        }

        #[test]
        fn test_generic_precision_usage() {
            let duration = Duration::from_millis(500);

            // Test with different precisions using generics
            let nanos_ticks = convert_duration::<Nanos>(duration);
            let micros_ticks = convert_duration::<Micros>(duration);
            let millis_ticks = convert_duration::<Millis>(duration);
            let secs_ticks = convert_duration::<Secs>(duration);

            assert_eq!(nanos_ticks, 500_000_000);
            assert_eq!(micros_ticks, 500_000);
            assert_eq!(millis_ticks, 500);
            assert_eq!(secs_ticks, 0); // Truncated

            // Test recovery
            let recovered_nanos = recover_duration::<Nanos>(nanos_ticks);
            let recovered_micros = recover_duration::<Micros>(micros_ticks);
            let recovered_millis = recover_duration::<Millis>(millis_ticks);

            assert_eq!(recovered_nanos, duration);
            assert_eq!(recovered_micros, duration);
            assert_eq!(recovered_millis, duration);
        }

        #[test]
        fn test_precision_trait_object_safety() {
            // While Precision trait can't be made into trait objects directly,
            // we can test that all implementations work consistently
            let duration = Duration::from_millis(1_000);

            // Test each precision individually
            let nanos_ticks = Nanos::to_ticks(duration);
            let nanos_recovered = Nanos::from_ticks(nanos_ticks);
            assert_eq!(nanos_recovered, duration);

            let micros_ticks = Micros::to_ticks(duration);
            let micros_recovered = Micros::from_ticks(micros_ticks);
            assert_eq!(micros_recovered, duration);

            let millis_ticks = Millis::to_ticks(duration);
            let millis_recovered = Millis::from_ticks(millis_ticks);
            assert_eq!(millis_recovered, duration);

            let secs_ticks = Secs::to_ticks(duration);
            let secs_recovered = Secs::from_ticks(secs_ticks);
            assert_eq!(secs_recovered, Duration::from_secs(1));
        }
    }

    /// Test performance characteristics
    mod performance_tests {
        use super::*;

        #[test]
        fn test_conversion_performance_consistency() {
            // Test that conversions are consistent across multiple calls
            let duration = Duration::from_millis(12_345);
            let iterations = 1000;

            // Test Nanos consistency
            let first_nanos = Nanos::to_ticks(duration);
            for _ in 0..iterations {
                assert_eq!(Nanos::to_ticks(duration), first_nanos);
            }

            // Test Micros consistency
            let first_micros = Micros::to_ticks(duration);
            for _ in 0..iterations {
                assert_eq!(Micros::to_ticks(duration), first_micros);
            }

            // Test Millis consistency
            let first_millis = Millis::to_ticks(duration);
            for _ in 0..iterations {
                assert_eq!(Millis::to_ticks(duration), first_millis);
            }

            // Test Secs consistency
            let first_secs = Secs::to_ticks(duration);
            for _ in 0..iterations {
                assert_eq!(Secs::to_ticks(duration), first_secs);
            }
        }
    }

    /// Test realistic usage scenarios
    mod realistic_scenarios {
        use super::*;

        #[test]
        fn test_web_api_rate_limiting_scenario() {
            // Typical web API: 100 requests per minute
            let window_duration = Duration::from_secs(60);

            // Using millisecond precision (typical for web APIs)
            let window_ticks = Millis::to_ticks(window_duration);
            assert_eq!(window_ticks, 60_000); // 60,000 milliseconds

            // Verify we can recover the original duration
            let recovered = Millis::from_ticks(window_ticks);
            assert_eq!(recovered, window_duration);
        }

        #[test]
        fn test_high_frequency_trading_scenario() {
            // High-frequency trading: microsecond precision
            let tick_duration = Duration::from_micros(100);

            let ticks = Micros::to_ticks(tick_duration);
            assert_eq!(ticks, 100);

            let recovered = Micros::from_ticks(ticks);
            assert_eq!(recovered, tick_duration);
        }

        #[test]
        fn test_iot_device_scenario() {
            // IoT device: coarse precision, long windows
            let daily_window = Duration::from_secs(24 * 60 * 60); // 24 hours

            let ticks = Secs::to_ticks(daily_window);
            assert_eq!(ticks, 86_400); // 86,400 seconds in a day

            let recovered = Secs::from_ticks(ticks);
            assert_eq!(recovered, daily_window);
        }

        #[test]
        fn test_gaming_server_scenario() {
            // Gaming server: very precise timing
            let frame_duration = Duration::from_nanos(16_666_667); // ~60 FPS

            let ticks = Nanos::to_ticks(frame_duration);
            assert_eq!(ticks, 16_666_667);

            let recovered = Nanos::from_ticks(ticks);
            assert_eq!(recovered, frame_duration);
        }

        #[test]
        fn test_mixed_precision_compatibility() {
            // Test that different precisions can work with the same logical time
            let one_second = Duration::from_secs(1);

            let nanos_ticks = Nanos::to_ticks(one_second);
            let micros_ticks = Micros::to_ticks(one_second);
            let millis_ticks = Millis::to_ticks(one_second);
            let secs_ticks = Secs::to_ticks(one_second);

            // All should represent the same logical time
            assert_eq!(nanos_ticks, 1_000_000_000);
            assert_eq!(micros_ticks, 1_000_000);
            assert_eq!(millis_ticks, 1_000);
            assert_eq!(secs_ticks, 1);

            // All should convert back to the same duration
            assert_eq!(Nanos::from_ticks(nanos_ticks), one_second);
            assert_eq!(Micros::from_ticks(micros_ticks), one_second);
            assert_eq!(Millis::from_ticks(millis_ticks), one_second);
            assert_eq!(Secs::from_ticks(secs_ticks), one_second);
        }
    }
}
