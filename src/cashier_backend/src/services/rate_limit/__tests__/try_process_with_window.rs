// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::rate_limit::TimeWindow;

use cashier_types::{keys::RateLimitKey, rate_limit::RateLimitIdentifier};

use super::*;

#[test]
fn test_try_process_with_window_first_request_success() {
    let service = create_test_service();
    let user = "test_user_123";
    let method = "test_method";

    // First request should succeed
    let result = service.try_process_with_window(user, method, 5, TimeWindow::Minutes(10));
    let key: RateLimitKey = RateLimitKey {
        identifier: RateLimitIdentifier::UserPrincipal(user.to_string()),
        method: method.to_string(),
        time_windows: TimeWindow::Minutes(10).to_seconds(),
    };
    let res = service.rate_limit_repository.get(&key);
    println!("Rate limit entry: {:?}", res);
    assert!(result.is_ok());
}

#[test]
fn test_try_process_with_window_multiple_requests_within_limit() {
    let service = create_test_service();
    let user = "test_user_123";
    let method = "test_method";
    let limit = 5;

    // Make multiple requests within the limit
    for i in 1..=limit {
        let result = service.try_process_with_window(user, method, limit, TimeWindow::Minutes(10));
        assert!(result.is_ok(), "Request {} should succeed", i);
    }
}

#[test]
fn test_try_process_with_window_exceeds_limit() {
    let service = create_test_service();
    let user = "test_user_123";
    let method = "test_method";
    let limit = 3;

    // Make requests up to the limit
    for i in 1..=limit {
        let result = service.try_process_with_window(user, method, limit, TimeWindow::Minutes(10));
        assert!(result.is_ok(), "Request {} should succeed", i);
    }

    // The next request should fail due to rate limiting
    let result = service.try_process_with_window(user, method, limit, TimeWindow::Minutes(10));

    assert!(result.is_err());
    if let Err(error) = result {
        let error_msg = format!("{:?}", error);
        assert!(error_msg.contains("Rate limit exceeded"));
        assert!(error_msg.contains("test_user_123"));
        assert!(error_msg.contains("test_method"));
        assert!(error_msg.contains("3 requests per 10 minutes"));
    }
}

#[test]
fn test_try_process_with_window_different_users_isolated() {
    let service = create_test_service();
    let user1 = "user_1";
    let user2 = "user_2";
    let method = "test_method";
    let limit = 2;

    // User 1 makes requests up to limit
    for i in 1..=limit {
        let result = service.try_process_with_window(user1, method, limit, TimeWindow::Minutes(10));
        assert!(result.is_ok(), "User 1 request {} should succeed", i);
    }

    // User 2 should still be able to make requests (isolated rate limiting)
    for i in 1..=limit {
        let result = service.try_process_with_window(user2, method, limit, TimeWindow::Minutes(10));
        assert!(result.is_ok(), "User 2 request {} should succeed", i);
    }

    // Both users should now be rate limited
    let result1 = service.try_process_with_window(user1, method, limit, TimeWindow::Minutes(10));
    assert!(result1.is_err(), "User 1 should be rate limited");

    let result2 = service.try_process_with_window(user2, method, limit, TimeWindow::Minutes(10));
    assert!(result2.is_err(), "User 2 should be rate limited");
}

#[test]
fn test_try_process_with_window_different_methods_isolated() {
    let service = create_test_service();
    let user = "test_user";
    let method1 = "method_1";
    let method2 = "method_2";
    let limit = 2;

    // Make requests to method1 up to limit
    for i in 1..=limit {
        let result = service.try_process_with_window(user, method1, limit, TimeWindow::Minutes(10));
        assert!(result.is_ok(), "Method 1 request {} should succeed", i);
    }

    // Method2 should still be available (isolated by method)
    for i in 1..=limit {
        let result = service.try_process_with_window(user, method2, limit, TimeWindow::Minutes(10));
        assert!(result.is_ok(), "Method 2 request {} should succeed", i);
    }

    // Both methods should now be rate limited for this user
    let result1 = service.try_process_with_window(user, method1, limit, TimeWindow::Minutes(10));
    assert!(result1.is_err(), "Method 1 should be rate limited");

    let result2 = service.try_process_with_window(user, method2, limit, TimeWindow::Minutes(10));
    assert!(result2.is_err(), "Method 2 should be rate limited");
}

#[test]
fn test_try_process_with_window_different_time_windows() {
    let service = create_test_service();
    let user = "test_user";
    let method = "test_method";

    // Test with 10-minute window
    let result_10min =
        service.try_process_with_window(user, "method_10min", 5, TimeWindow::Minutes(10));
    assert!(result_10min.is_ok());

    // Test with 1-hour window
    let result_1hour =
        service.try_process_with_window(user, "method_1hour", 10, TimeWindow::Hours(1));
    assert!(result_1hour.is_ok());

    // Test with 1-day window
    let result_1day =
        service.try_process_with_window(user, "method_1day", 100, TimeWindow::Days(1));
    assert!(result_1day.is_ok());
}

#[test]
fn test_try_process_with_window_custom_windows() {
    let service = create_test_service();
    let user = "test_user";

    // Test with 30-minute window
    let result_30min =
        service.try_process_with_window(user, "method_30min", 15, TimeWindow::Minutes(30));
    assert!(result_30min.is_ok());

    // Test with 6-hour window
    let result_6hour =
        service.try_process_with_window(user, "method_6hour", 50, TimeWindow::Hours(6));
    assert!(result_6hour.is_ok());

    // Test with 7-day window
    let result_7day =
        service.try_process_with_window(user, "method_7day", 1000, TimeWindow::Days(7));
    assert!(result_7day.is_ok());
}

#[test]
fn test_try_process_with_window_zero_limit() {
    let service = create_test_service();
    let user = "test_user";
    let method = "test_method";

    // With limit 0, first request should fail
    let result = service.try_process_with_window(user, method, 0, TimeWindow::Minutes(10));

    assert!(result.is_err());
    if let Err(error) = result {
        let error_msg = format!("{:?}", error);
        assert!(error_msg.contains("HandleLogicError"));
        assert!(error_msg
            .contains("Rate limit cannot be zero for user test_user on method test_method"));
    }
}

#[test]
fn test_try_process_with_window_error_message_format() {
    let service = create_test_service();
    let user = "test_user_456";
    let method = "create_link";
    let limit = 1;

    // First request succeeds
    let result1 = service.try_process_with_window(user, method, limit, TimeWindow::Minutes(10));
    assert!(result1.is_ok());

    // Second request should fail with proper error message
    let result2 = service.try_process_with_window(user, method, limit, TimeWindow::Minutes(10));

    assert!(result2.is_err());
    if let Err(error) = result2 {
        let error_msg = format!("{:?}", error);

        // Check that error message contains all expected components
        assert!(error_msg.contains("Rate limit exceeded"));
        assert!(error_msg.contains("test_user_456"));
        assert!(error_msg.contains("create_link"));
        assert!(error_msg.contains("1 requests per 10 minutes"));
        assert!(error_msg.contains("Try again after"));
        assert!(error_msg.contains("ms"));
    }
}

#[test]
fn test_try_process_with_window_hour_window_error_message() {
    let service = create_test_service();
    let user = "test_user";
    let method = "hourly_method";
    let limit = 1;

    // First request succeeds
    let result1 = service.try_process_with_window(user, method, limit, TimeWindow::Hours(2));
    assert!(result1.is_ok());

    // Second request should fail with hour-specific error message
    let result2 = service.try_process_with_window(user, method, limit, TimeWindow::Hours(2));

    assert!(result2.is_err());
    if let Err(error) = result2 {
        let error_msg = format!("{:?}", error);
        assert!(error_msg.contains("1 requests per 2 hours"));
    }
}

#[test]
fn test_try_process_with_window_day_window_error_message() {
    let service = create_test_service();
    let user = "test_user";
    let method = "daily_method";
    let limit = 1;

    // First request succeeds
    let result1 = service.try_process_with_window(user, method, limit, TimeWindow::Days(3));
    assert!(result1.is_ok());

    // Second request should fail with day-specific error message
    let result2 = service.try_process_with_window(user, method, limit, TimeWindow::Days(3));

    assert!(result2.is_err());
    if let Err(error) = result2 {
        let error_msg = format!("{:?}", error);
        assert!(error_msg.contains("1 requests per 3 days"));
    }
}
