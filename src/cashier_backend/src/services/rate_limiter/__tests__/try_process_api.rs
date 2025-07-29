// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::rate_limiter::RateLimitService;

#[cfg(test)]
mod tests {
    use crate::utils::runtime::test_utils::MockIcEnvironment;

    use super::*;

    fn create_test_service() -> RateLimitService<MockIcEnvironment> {
        let mock_env = MockIcEnvironment::new();
        RateLimitService::new(mock_env)
    }

    #[test]
    fn test_try_process_api_create_link_success() {
        let service = create_test_service();
        let user = "test_user_123";

        // First request should succeed
        let result = service.try_process_api(user, "create_link");
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_process_api_create_action_success() {
        let service = create_test_service();
        let user = "test_user_123";

        // First request should succeed
        let result = service.try_process_api(user, "create_action");
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_process_api_process_action_success() {
        let service = create_test_service();
        let user = "test_user_123";

        // First request should succeed
        let result = service.try_process_api(user, "process_action");
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_process_api_update_action_success() {
        let service = create_test_service();
        let user = "test_user_123";

        // First request should succeed
        let result = service.try_process_api(user, "update_action");
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_process_api_unknown_method_error() {
        let service = create_test_service();
        let user = "test_user_123";

        // Unknown method should fail
        let result = service.try_process_api(user, "unknown_method");
        assert!(result.is_err());

        if let Err(error) = result {
            let error_msg = format!("{:?}", error);
            assert!(error_msg.contains("HandleLogicError"));
            assert!(error_msg.contains("Unknown method: unknown_method"));
        }
    }

    #[test]
    fn test_try_process_api_create_link_rate_limit_5_per_10_minutes() {
        let service = create_test_service();
        let user = "test_user_123";
        let method = "create_link";

        // Make 5 requests (should all succeed - this is the limit)
        for i in 1..=5 {
            let result = service.try_process_api(user, method);
            assert!(result.is_ok(), "Request {} should succeed", i);
        }

        // 6th request should fail due to rate limiting
        let result = service.try_process_api(user, method);
        assert!(result.is_err());

        if let Err(error) = result {
            let error_msg = format!("{:?}", error);
            assert!(error_msg.contains("Rate limit exceeded"));
            assert!(error_msg.contains("test_user_123"));
            assert!(error_msg.contains("create_link"));
            assert!(error_msg.contains("5 requests per 10 minutes"));
        }
    }

    #[test]
    fn test_try_process_api_create_action_rate_limit_5_per_10_minutes() {
        let service = create_test_service();
        let user = "test_user_456";
        let method = "create_action";

        // Make 5 requests (should all succeed)
        for i in 1..=5 {
            let result = service.try_process_api(user, method);
            assert!(result.is_ok(), "Request {} should succeed", i);
        }

        // 6th request should fail
        let result = service.try_process_api(user, method);
        assert!(result.is_err());

        if let Err(error) = result {
            let error_msg = format!("{:?}", error);
            assert!(error_msg.contains("Rate limit exceeded"));
            assert!(error_msg.contains("test_user_456"));
            assert!(error_msg.contains("create_action"));
            assert!(error_msg.contains("5 requests per 10 minutes"));
        }
    }

    #[test]
    fn test_try_process_api_process_action_rate_limit_5_per_10_minutes() {
        let service = create_test_service();
        let user = "test_user_789";
        let method = "process_action";

        // Make 5 requests (should all succeed)
        for i in 1..=5 {
            let result = service.try_process_api(user, method);
            assert!(result.is_ok(), "Request {} should succeed", i);
        }

        // 6th request should fail
        let result = service.try_process_api(user, method);
        assert!(result.is_err());

        if let Err(error) = result {
            let error_msg = format!("{:?}", error);
            assert!(error_msg.contains("Rate limit exceeded"));
            assert!(error_msg.contains("test_user_789"));
            assert!(error_msg.contains("process_action"));
            assert!(error_msg.contains("5 requests per 10 minutes"));
        }
    }

    #[test]
    fn test_try_process_api_update_action_rate_limit_5_per_10_minutes() {
        let service = create_test_service();
        let user = "test_user_abc";
        let method = "update_action";

        // Make 5 requests (should all succeed)
        for i in 1..=5 {
            let result = service.try_process_api(user, method);
            assert!(result.is_ok(), "Request {} should succeed", i);
        }

        // 6th request should fail
        let result = service.try_process_api(user, method);
        assert!(result.is_err());

        if let Err(error) = result {
            let error_msg = format!("{:?}", error);
            assert!(error_msg.contains("Rate limit exceeded"));
            assert!(error_msg.contains("test_user_abc"));
            assert!(error_msg.contains("update_action"));
            assert!(error_msg.contains("5 requests per 10 minutes"));
        }
    }

    #[test]
    fn test_try_process_api_different_users_isolated() {
        let service = create_test_service();
        let user1 = "user_1";
        let user2 = "user_2";
        let method = "create_link";

        // User 1 makes 5 requests (limit)
        for i in 1..=5 {
            let result = service.try_process_api(user1, method);
            assert!(result.is_ok(), "User 1 request {} should succeed", i);
        }

        // User 2 should still be able to make requests (isolated rate limiting)
        for i in 1..=5 {
            let result = service.try_process_api(user2, method);
            assert!(result.is_ok(), "User 2 request {} should succeed", i);
        }

        // Both users should now be rate limited
        let result1 = service.try_process_api(user1, method);
        assert!(result1.is_err(), "User 1 should be rate limited");

        let result2 = service.try_process_api(user2, method);
        assert!(result2.is_err(), "User 2 should be rate limited");
    }

    #[test]
    fn test_try_process_api_different_methods_isolated() {
        let service = create_test_service();
        let user = "test_user";

        // Use up rate limit for create_link
        for i in 1..=5 {
            let result = service.try_process_api(user, "create_link");
            assert!(result.is_ok(), "create_link request {} should succeed", i);
        }

        // create_action should still be available (different method)
        for i in 1..=5 {
            let result = service.try_process_api(user, "create_action");
            assert!(result.is_ok(), "create_action request {} should succeed", i);
        }

        // Both methods should now be rate limited for this user
        let result1 = service.try_process_api(user, "create_link");
        assert!(result1.is_err(), "create_link should be rate limited");

        let result2 = service.try_process_api(user, "create_action");
        assert!(result2.is_err(), "create_action should be rate limited");
    }

    #[test]
    fn test_try_process_api_all_methods_have_same_rate_limit() {
        let service = create_test_service();
        let user = "test_user";

        let methods = [
            "create_link",
            "create_action",
            "process_action",
            "update_action",
        ];

        for method in &methods {
            // Each method should allow exactly 5 requests
            for i in 1..=5 {
                let result = service.try_process_api(user, method);
                assert!(
                    result.is_ok(),
                    "Method {} request {} should succeed",
                    method,
                    i
                );
            }

            // 6th request should fail for each method
            let result = service.try_process_api(user, method);
            assert!(result.is_err(), "Method {} should be rate limited", method);

            if let Err(error) = result {
                let error_msg = format!("{:?}", error);
                assert!(error_msg.contains("5 requests per 10 minutes"));
            }
        }
    }

    #[test]
    fn test_try_process_api_error_message_format() {
        let service = create_test_service();
        let user = "specific_user_id";
        let method = "create_link";

        // Use up the rate limit
        for i in 1..=5 {
            let result = service.try_process_api(user, method);
            assert!(result.is_ok(), "Request {} should succeed", i);
        }

        // Next request should fail with proper error message
        let result = service.try_process_api(user, method);
        assert!(result.is_err());

        if let Err(error) = result {
            let error_msg = format!("{:?}", error);

            // Check that error message contains all expected components
            assert!(error_msg.contains("HandleLogicError"));
            assert!(error_msg.contains("Rate limit exceeded"));
            assert!(error_msg.contains("specific_user_id"));
            assert!(error_msg.contains("create_link"));
            assert!(error_msg.contains("5 requests per 10 minutes"));
            assert!(error_msg.contains("Try again after"));
            assert!(error_msg.contains("ms"));
        }
    }

    #[test]
    fn test_try_process_api_multiple_unknown_methods() {
        let service = create_test_service();
        let user = "test_user";

        let unknown_methods = [
            "delete_link",
            "get_link",
            "list_actions",
            "invalid_method",
            "",
            "create_link_v2",
        ];

        for method in &unknown_methods {
            let result = service.try_process_api(user, method);
            assert!(result.is_err(), "Unknown method '{}' should fail", method);

            if let Err(error) = result {
                let error_msg = format!("{:?}", error);
                assert!(error_msg.contains("HandleLogicError"));
                assert!(error_msg.contains(&format!("Unknown method: {}", method)));
            }
        }
    }

    #[test]
    fn test_try_process_api_case_sensitive_methods() {
        let service = create_test_service();
        let user = "test_user";

        // Case variations should be treated as unknown methods
        let case_variations = [
            "Create_Link",
            "CREATE_LINK",
            "create_Link",
            "Create_Action",
            "PROCESS_ACTION",
            "Update_Action",
        ];

        for method in &case_variations {
            let result = service.try_process_api(user, method);
            assert!(
                result.is_err(),
                "Case variation '{}' should be treated as unknown",
                method
            );

            if let Err(error) = result {
                let error_msg = format!("{:?}", error);
                assert!(error_msg.contains("Unknown method"));
            }
        }
    }
}
