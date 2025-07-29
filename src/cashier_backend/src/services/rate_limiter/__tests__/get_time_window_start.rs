// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::rate_limiter::{RateLimitService, TimeWindow};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_time_window_start_10_minutes() {
        // Test with 10-minute windows

        // Test case 1: 1753768505000000000 nanoseconds (around 2025-07-29 10:08:25 UTC)
        let input_time_ns = 1753768505000000000u64;
        let result =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                input_time_ns,
                TimeWindow::Minutes(10),
            );

        // Calculate expected result:
        // 1. Convert to seconds: 1753768505000000000 / 1_000_000_000 = 1753768505
        // 2. Divide by 600 (10 minutes): 1753768505 / 600 = 2922947 (integer division)
        // 3. Multiply back: 2922947 * 600 * 1_000_000_000 = 1753768200000000000
        let expected = 1753768200000000000u64;

        assert_eq!(result, expected);

        // Verify the calculation step by step
        let time_seconds = input_time_ns / 1_000_000_000;
        let ten_minute_intervals = time_seconds / 600;
        let window_start_seconds = ten_minute_intervals * 600;
        let window_start_ns = window_start_seconds * 1_000_000_000;

        assert_eq!(time_seconds, 1753768505);
        assert_eq!(ten_minute_intervals, 2922947);
        assert_eq!(window_start_seconds, 1753768200);
        assert_eq!(result, window_start_ns);
    }

    #[test]
    fn test_get_time_window_start_1_hour() {
        // Test with 1-hour windows

        // Using the same timestamp: 1753768505000000000 ns
        let input_time_ns = 1753768505000000000u64;
        let result =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                input_time_ns,
                TimeWindow::Hours(1),
            );

        // Calculate expected result for 1-hour window:
        // 1. Convert to seconds: 1753768505
        // 2. Divide by 3600 (1 hour): 1753768505 / 3600 = 487157 (integer division)
        // 3. Multiply back: 487157 * 3600 * 1_000_000_000 = 1753765200000000000
        let expected = 1753765200000000000u64;

        assert_eq!(result, expected);
    }

    #[test]
    fn test_get_time_window_start_1_day() {
        // Test with 1-day windows

        // Using the same timestamp: 1753768505000000000 ns
        let input_time_ns = 1753768505000000000u64;
        let result =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                input_time_ns,
                TimeWindow::Days(1),
            );

        // Calculate expected result for 1-day window:
        // 1. Convert to seconds: 1753768505
        // 2. Divide by 86400 (1 day): 1753768505 / 86400 = 20298 (integer division)
        // 3. Multiply back: 20298 * 86400 * 1_000_000_000 = 1753747200000000000
        let expected = 1753747200000000000u64;

        assert_eq!(result, expected);
    }

    #[test]
    fn test_get_time_window_start_boundary_cases() {
        // Test at exact boundaries for different window types

        // 10-minute window boundaries
        let ten_minutes_ns = 600 * 1_000_000_000u64; // Exactly 10 minutes since epoch
        let result_10min =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                ten_minutes_ns,
                TimeWindow::Minutes(10),
            );
        assert_eq!(result_10min, 600 * 1_000_000_000u64); // Should be exactly 10 minutes

        let twenty_minutes_ns = 1200 * 1_000_000_000u64; // Exactly 20 minutes since epoch
        let result_20min =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                twenty_minutes_ns,
                TimeWindow::Minutes(10),
            );
        assert_eq!(result_20min, 1200 * 1_000_000_000u64); // Should be exactly 20 minutes

        // Just before 10-minute boundary
        let just_before_10min_ns = (600 * 1_000_000_000u64) - 1;
        let result_before =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                just_before_10min_ns,
                TimeWindow::Minutes(10),
            );
        assert_eq!(result_before, 0); // Should round down to epoch

        // 1-hour window boundaries
        let one_hour_ns = 3600 * 1_000_000_000u64; // Exactly 1 hour since epoch
        let result_1hour =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                one_hour_ns,
                TimeWindow::Hours(1),
            );
        assert_eq!(result_1hour, 3600 * 1_000_000_000u64);

        // 1-day window boundaries
        let one_day_ns = 86400 * 1_000_000_000u64; // Exactly 1 day since epoch
        let result_1day =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                one_day_ns,
                TimeWindow::Days(1),
            );
        assert_eq!(result_1day, 86400 * 1_000_000_000u64);
    }

    #[test]
    fn test_get_time_window_start_epoch() {
        // Test at Unix epoch (time 0) for all window types
        let epoch_ns = 0u64;

        let result_minutes =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                epoch_ns,
                TimeWindow::Minutes(10),
            );
        assert_eq!(result_minutes, 0);

        let result_hours =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                epoch_ns,
                TimeWindow::Hours(1),
            );
        assert_eq!(result_hours, 0);

        let result_days =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                epoch_ns,
                TimeWindow::Days(1),
            );
        assert_eq!(result_days, 0);
    }

    #[test]
    fn test_get_time_window_start_custom_windows() {
        // Test with custom window sizes
        let input_time_ns = 7265000000000u64; // 2 hours, 1 minute, 5 seconds in nanoseconds

        // 30-minute window
        let result_30min =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                input_time_ns,
                TimeWindow::Minutes(30),
            );
        // 7265 seconds / 1800 (30 minutes) = 4.036... -> 4 intervals
        // 4 * 1800 * 1_000_000_000 = 7200000000000
        assert_eq!(result_30min, 7200000000000u64);

        // 6-hour window
        let result_6hour =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                input_time_ns,
                TimeWindow::Hours(6),
            );
        // 7265 seconds / 21600 (6 hours) = 0.336... -> 0 intervals
        // 0 * 21600 * 1_000_000_000 = 0
        assert_eq!(result_6hour, 0u64);

        // 2-day window
        let large_time_ns = 259200000000000u64; // 3 days in nanoseconds
        let result_2day =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                large_time_ns,
                TimeWindow::Days(2),
            );
        // 259200 seconds / 172800 (2 days) = 1.5 -> 1 interval
        // 1 * 172800 * 1_000_000_000 = 172800000000000
        assert_eq!(result_2day, 172800000000000u64);
    }

    #[test]
    fn test_get_time_window_start_real_world_scenarios() {
        // Test with realistic scenarios that demonstrate the "fixed window" behavior

        // Scenario 1: Two requests within the same 10-minute window and one in a different window
        let time_05_53 = 1753768380000000000u64; // 05:53:00
        let time_05_57 = 1753768620000000000u64; // 05:57:00
        let time_06_04 = 1753769040000000000u64; // 06:04:00

        let window_start_1 =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                time_05_53,
                TimeWindow::Minutes(10),
            );
        let window_start_2 =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                time_05_57,
                TimeWindow::Minutes(10),
            );
        let window_start_3 =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                time_06_04,
                TimeWindow::Minutes(10),
            );

        // Both should map to the same window start (10:10)
        assert_eq!(window_start_1, window_start_2);
        assert_ne!(window_start_2, window_start_3);

        // Scenario 2: Two requests in different 1-hour windows
        let time_10_30 = 1753769400000000000u64; // Simulating 10:30
        let time_11_30 = 1753772400000000000u64; // Simulating 11:30 (1 hour later)

        let hour_window_1 =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                time_10_30,
                TimeWindow::Hours(1),
            );
        let hour_window_2 =
            RateLimitService::<crate::utils::runtime::RealIcEnvironment>::get_time_window_start(
                time_11_30,
                TimeWindow::Hours(1),
            );

        // These should map to different hour windows
        assert_ne!(hour_window_1, hour_window_2);
        assert_eq!(hour_window_2 - hour_window_1, 3600 * 1_000_000_000); // 1 hour difference
    }
}
