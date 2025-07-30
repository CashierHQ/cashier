pub mod get_time_window_start;
pub mod try_process_api;
pub mod try_process_with_window;

use crate::{
    repositories::rate_limit::RateLimitRepository, services::rate_limit::RateLimitService,
    utils::runtime::test_utils::MockIcEnvironment,
};

fn create_test_service() -> RateLimitService<MockIcEnvironment, RateLimitRepository> {
    let mock_env = MockIcEnvironment::new();
    let mock_rate_limit_repo = RateLimitRepository::new();
    RateLimitService::new(mock_env, mock_rate_limit_repo)
}
