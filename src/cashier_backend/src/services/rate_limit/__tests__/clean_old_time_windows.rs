// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::rate_limit::{RateLimitService, TimeWindow};

#[cfg(test)]
mod tests {
    use crate::utils::runtime::test_utils::MockIcEnvironment;

    use super::*;

    fn create_test_service() -> RateLimitService<MockIcEnvironment> {
        let mock_env = MockIcEnvironment::new();
        RateLimitService::new(mock_env)
    }

    fn create_test_service_with_time(time_ns: u64) -> RateLimitService<MockIcEnvironment> {
        let mock_env = MockIcEnvironment::new_with_time(time_ns);
        RateLimitService::new(mock_env)
    }

    #[test]
    fn test_clean_old_time_windows_no_entries() {
        let service = create_test_service();

        // Call cleanup when there are no entries
        let cleaned = service.clean_old_time_windows();

        // Should return empty vector
        assert!(cleaned.is_empty());
    }

    #[test]
    fn test_clean_old_time_windows_no_expired_entries() {
        let service = create_test_service();
        let user = "test_user";
        let method = "create_link";

        // Create some active entries (not expired)
        for i in 1..=3 {
            let result = service.try_process_with_window(
                &format!("{}_{}", user, i),
                method,
                5,
                TimeWindow::Minutes(10),
            );
            assert!(result.is_ok());
        }

        // Clean up - should not remove any entries since they're not expired
        let cleaned = service.clean_old_time_windows();

        // Should return empty vector since no entries are expired
        assert!(cleaned.is_empty());
    }

    #[test]
    fn test_clean_old_time_windows_with_expired_entries() {
        // Start time: Jan 1, 2022
        let initial_time = 1640995200000000000u64; // nanoseconds
        let service_old = create_test_service_with_time(initial_time);
        let user = "test_user";
        let method = "create_link";

        // Create some entries at the initial time
        for i in 1..=3 {
            let result = service_old.try_process_with_window(
                &format!("{}_{}", user, i),
                method,
                5,
                TimeWindow::Minutes(10),
            );
            assert!(result.is_ok());
        }

        // Create a new service 15 minutes later to clean up expired entries
        let later_time = initial_time + (15 * 60 * 1_000_000_000); // 15 minutes later
        let service_new = create_test_service_with_time(later_time);

        // Clean up expired entries (all entries should be expired since we're 15 minutes later and window is 10 minutes)
        let cleaned = service_new.clean_old_time_windows();

        // Should have cleaned up 3 entries
        assert_eq!(cleaned.len(), 3);

        // Verify that each cleaned entry contains the expected user data
        for (key, entry) in &cleaned {
            assert!(key.contains(user));
            assert!(key.contains(method));
            assert_eq!(entry.count, 1); // Each entry should have count 1
        }
    }

    #[test]
    fn test_clean_old_time_windows_mixed_expired_and_active() {
        let initial_time = 1640995200000000000u64;
        let service_old = create_test_service_with_time(initial_time);
        let user = "test_user";
        let method = "create_link";

        // Create some entries that will expire
        for i in 1..=2 {
            let result = service_old.try_process_with_window(
                &format!("old_{}_{}", user, i),
                method,
                5,
                TimeWindow::Minutes(10),
            );
            assert!(result.is_ok());
        }

        // Create a new service 15 minutes later
        let later_time = initial_time + (15 * 60 * 1_000_000_000); // 15 minutes later
        let service_new = create_test_service_with_time(later_time);

        // Create some new entries that won't expire (using the later time)
        for i in 1..=2 {
            let result = service_new.try_process_with_window(
                &format!("new_{}_{}", user, i),
                method,
                5,
                TimeWindow::Minutes(10),
            );
            assert!(result.is_ok());
        }

        // Clean up expired entries
        let cleaned = service_new.clean_old_time_windows();

        // Should only clean up the 2 expired entries (old ones)
        assert_eq!(cleaned.len(), 2);

        // Verify that only the old entries were cleaned
        for (key, _) in &cleaned {
            assert!(key.contains("old_"));
            assert!(!key.contains("new_"));
        }

        // Verify that new entries are still active by trying to make more requests
        for i in 1..=2 {
            let result = service_new.try_process_with_window(
                &format!("new_{}_{}", user, i),
                method,
                5,
                TimeWindow::Minutes(10),
            );
            assert!(result.is_ok()); // Should succeed since these entries are still active
        }
    }

    #[test]
    fn test_clean_old_time_windows_different_time_windows() {
        let initial_time = 1640995200000000000u64;
        let service_initial = create_test_service_with_time(initial_time);
        let user = "test_user";

        // Create entries with different time windows
        let result1 =
            service_initial.try_process_with_window(user, "method_1min", 5, TimeWindow::Minutes(1));
        assert!(result1.is_ok());

        let result2 =
            service_initial.try_process_with_window(user, "method_1hour", 5, TimeWindow::Hours(1));
        assert!(result2.is_ok());

        let result3 =
            service_initial.try_process_with_window(user, "method_1day", 5, TimeWindow::Days(1));
        assert!(result3.is_ok());

        // Service 2 minutes later (should expire 1-minute window only)
        let time_2min_later = initial_time + (2 * 60 * 1_000_000_000); // 2 minutes later
        let service_2min = create_test_service_with_time(time_2min_later);

        let cleaned = service_2min.clean_old_time_windows();

        // Should only clean up the 1-minute window entry
        assert_eq!(cleaned.len(), 1);

        let (key, _) = &cleaned[0];
        assert!(key.contains("method_1min"));

        // Service 2 hours later (should expire 1-hour window)
        let time_2hour_later = initial_time + (2 * 60 * 60 * 1_000_000_000); // 2 hours later
        let service_2hour = create_test_service_with_time(time_2hour_later);

        let cleaned2 = service_2hour.clean_old_time_windows();

        // Should clean up the 1-hour window entry
        assert_eq!(cleaned2.len(), 1);

        let (key, _) = &cleaned2[0];
        assert!(key.contains("method_1hour"));
    }

    #[test]
    fn test_clean_old_time_windows_multiple_calls() {
        let initial_time = 1640995200000000000u64;
        let service_initial = create_test_service_with_time(initial_time);
        let user = "test_user";
        let method = "create_link";

        // Create some entries
        for i in 1..=3 {
            let result = service_initial.try_process_with_window(
                &format!("{}_{}", user, i),
                method,
                5,
                TimeWindow::Minutes(10),
            );
            assert!(result.is_ok());
        }

        // First cleanup call - no entries should be expired yet
        let cleaned1 = service_initial.clean_old_time_windows();
        assert!(cleaned1.is_empty());

        // Service 15 minutes later to clean up expired entries
        let later_time = initial_time + (15 * 60 * 1_000_000_000); // 15 minutes later
        let service_later = create_test_service_with_time(later_time);

        // Second cleanup call - should clean up all entries
        let cleaned2 = service_later.clean_old_time_windows();
        assert_eq!(cleaned2.len(), 3);

        // Third cleanup call - should find nothing to clean
        let cleaned3 = service_later.clean_old_time_windows();
        assert!(cleaned3.is_empty());
    }

    #[test]
    fn test_clean_old_time_windows_entry_details() {
        let initial_time = 1640995200000000000u64;
        let service_initial = create_test_service_with_time(initial_time);
        let user = "specific_user";
        let method = "create_action";

        // Create an entry with multiple counts
        for i in 1..=3 {
            let result =
                service_initial.try_process_with_window(user, method, 5, TimeWindow::Minutes(10));
            assert!(result.is_ok(), "Request {} should succeed", i);
        }

        // Service 15 minutes later to clean up expired entries
        let later_time = initial_time + (15 * 60 * 1_000_000_000); // 15 minutes later
        let service_later = create_test_service_with_time(later_time);

        // Clean up expired entries
        let cleaned = service_later.clean_old_time_windows();

        // Should have exactly one cleaned entry
        assert_eq!(cleaned.len(), 1);

        let (key, entry) = &cleaned[0];

        // Verify key contains user and method
        assert!(key.contains(user));
        assert!(key.contains(method));

        // Verify entry details
        assert_eq!(entry.count, 3); // Should have count of 3 from our requests

        // The end_time should be in the past relative to current time
        use crate::utils::runtime::IcEnvironment;
        let current_time = service_later.ic_env.time();
        assert!(entry.end_time < current_time);
    }

    #[test]
    fn test_clean_old_time_windows_different_users() {
        let initial_time = 1640995200000000000u64;
        let service_initial = create_test_service_with_time(initial_time);
        let method = "create_link";

        // Create entries for different users
        let users = ["user_a", "user_b", "user_c"];
        for user in &users {
            let result =
                service_initial.try_process_with_window(user, method, 5, TimeWindow::Minutes(5));
            assert!(result.is_ok());
        }

        // Service 10 minutes later to clean up expired entries
        let later_time = initial_time + (10 * 60 * 1_000_000_000); // 10 minutes later
        let service_later = create_test_service_with_time(later_time);

        // Clean up expired entries
        let cleaned = service_later.clean_old_time_windows();

        // Should clean up entries for all users
        assert_eq!(cleaned.len(), 3);

        // Verify each user's entry was cleaned
        let cleaned_users: Vec<String> = cleaned
            .iter()
            .map(|(key, _)| {
                // Extract user from key (key format includes user)
                for user in &users {
                    if key.contains(user) {
                        return user.to_string();
                    }
                }
                "unknown".to_string()
            })
            .collect();

        for user in &users {
            assert!(cleaned_users.contains(&user.to_string()));
        }
    }

    #[test]
    fn test_clean_old_time_windows_return_value_structure() {
        let initial_time = 1640995200000000000u64;
        let service_initial = create_test_service_with_time(initial_time);
        let user = "test_user";
        let method = "process_action";

        // Create an entry
        let result =
            service_initial.try_process_with_window(user, method, 3, TimeWindow::Minutes(5));
        assert!(result.is_ok());

        // Make additional requests to increase count
        let result2 =
            service_initial.try_process_with_window(user, method, 3, TimeWindow::Minutes(5));
        assert!(result2.is_ok());

        // Service 10 minutes later to clean up expired entries
        let later_time = initial_time + (10 * 60 * 1_000_000_000); // 10 minutes later
        let service_later = create_test_service_with_time(later_time);

        // Clean up and verify return structure
        let cleaned = service_later.clean_old_time_windows();

        assert_eq!(cleaned.len(), 1);

        let (key, entry) = &cleaned[0];

        // Key should be a string
        assert!(!key.is_empty());
        assert!(key.contains(user));
        assert!(key.contains(method));

        // Entry should have proper structure
        assert_eq!(entry.count, 2); // Two requests were made
        assert!(entry.end_time > 0); // Should have a valid timestamp
    }

    #[test]
    fn test_clean_old_time_windows_preserves_non_expired() {
        let initial_time = 1640995200000000000u64;
        let service_initial = create_test_service_with_time(initial_time);
        let user = "test_user";

        // Create an expired entry
        let result1 =
            service_initial.try_process_with_window(user, "old_method", 5, TimeWindow::Minutes(5));
        assert!(result1.is_ok());

        // Service 10 minutes later
        let later_time = initial_time + (10 * 60 * 1_000_000_000); // 10 minutes later
        let service_later = create_test_service_with_time(later_time);

        // Create a new entry that shouldn't expire (using the later time)
        let result2 =
            service_later.try_process_with_window(user, "new_method", 5, TimeWindow::Minutes(5));
        assert!(result2.is_ok());

        // Clean up expired entries
        let cleaned = service_later.clean_old_time_windows();

        // Should only clean the expired entry
        assert_eq!(cleaned.len(), 1);

        let (key, _) = &cleaned[0];
        assert!(key.contains("old_method"));

        // Verify the new entry is still active by making another request
        let result3 =
            service_later.try_process_with_window(user, "new_method", 5, TimeWindow::Minutes(5));
        assert!(result3.is_ok()); // Should succeed, proving entry wasn't cleaned
    }
}
