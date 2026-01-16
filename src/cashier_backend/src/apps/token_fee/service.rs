// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Token fee caching service with TTL-based expiration.

use super::{TOKEN_FEE_TTL_NS, TokenFetcher};
use crate::repositories::{
    Repositories,
    token_fee::{CachedFee, TokenFeeRepository, TokenFeeRepositoryStorage},
};
use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::common::Asset;
use cashier_common::runtime::IcEnvironment;
use ic_mple_log::service::Storage;
use std::collections::HashMap;

/// Token fee caching service.
/// Caches token fees in memory with configurable TTL.
/// Generic over environment (for time), fetcher (for external calls), and repository storage.
pub struct TokenFeeService<S: Storage<TokenFeeRepositoryStorage>, E: IcEnvironment, F: TokenFetcher>
{
    token_fee_repo: TokenFeeRepository<S>,
    ic_env: E,
    fetcher: F,
}

impl<S: Storage<TokenFeeRepositoryStorage>, E: IcEnvironment, F: TokenFetcher>
    TokenFeeService<S, E, F>
{
    /// Create new TokenFeeService with repository, environment, and fetcher
    pub fn new(token_fee_repo: TokenFeeRepository<S>, ic_env: E, fetcher: F) -> Self {
        Self {
            token_fee_repo,
            ic_env,
            fetcher,
        }
    }

    /// Create from Repositories trait impl
    pub fn from_repositories<R: Repositories<TokenFee = S>>(
        repositories: &R,
        ic_env: E,
        fetcher: F,
    ) -> Self {
        Self::new(repositories.token_fee(), ic_env, fetcher)
    }

    /// Get TTL in nanoseconds
    fn ttl_ns(&self) -> u64 {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow())
    }

    /// Clear all cached fees
    pub fn clear_all(&mut self) {
        self.token_fee_repo.clear();
    }

    /// Clear cached fee for specific token
    pub fn clear_token(&mut self, token_key: &str) {
        self.token_fee_repo.remove(token_key);
    }

    /// Check if cached fee is still valid (not expired)
    fn is_valid(&self, cached: &CachedFee) -> bool {
        self.ic_env.time().saturating_sub(cached.updated_at) < self.ttl_ns()
    }

    /// Get fees for batch of tokens, using cache where valid
    pub async fn get_batch_tokens_fee(
        &mut self,
        assets: &[Asset],
    ) -> Result<HashMap<Principal, Nat>, CanisterError> {
        let mut fee_map_result = HashMap::with_capacity(assets.len());

        for asset in assets {
            let address = match asset {
                Asset::IC { address, .. } => *address,
            };
            let key = address.to_text();

            // Check cache first
            if let Some(cached) = self.token_fee_repo.get(&key)
                && self.is_valid(&cached)
            {
                fee_map_result.insert(address, cached.fee);
                continue;
            }

            // Cache miss or expired - fetch fresh via injected fetcher
            let fee = self.fetcher.fetch_fee(address).await.map_err(|e| {
                CanisterError::CallCanisterFailed(format!("Failed to get fee for {}: {:?}", key, e))
            })?;

            // Cache the fetched fee
            let updated_at = self.ic_env.time();
            self.token_fee_repo.insert(
                &key,
                CachedFee {
                    fee: fee.clone(),
                    updated_at,
                },
            );
            fee_map_result.insert(address, fee);
        }

        Ok(fee_map_result)
    }
}

#[cfg(test)]
mod tests {
    use super::super::MockTokenFetcher;
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use candid::Nat;
    use cashier_common::constant::DEFAULT_TOKEN_FEE_TTL_NS;
    use ic_cdk_timers::TimerId;
    use std::cell::RefCell;
    use std::time::Duration;

    /// Mock IC environment for testing
    #[derive(Clone)]
    struct MockIcEnvironment {
        current_time: u64,
        spawned: RefCell<Vec<String>>,
        timers: RefCell<Vec<Duration>>,
    }

    impl Default for MockIcEnvironment {
        fn default() -> Self {
            Self {
                current_time: 0,
                spawned: RefCell::new(Vec::new()),
                timers: RefCell::new(Vec::new()),
            }
        }
    }

    impl IcEnvironment for MockIcEnvironment {
        fn time(&self) -> u64 {
            self.current_time
        }

        fn id(&self) -> Principal {
            Principal::anonymous()
        }

        fn spawn<F>(&self, _future: F)
        where
            F: std::future::Future<Output = ()> + 'static,
        {
            self.spawned.borrow_mut().push("spawned".to_string());
        }

        fn set_timer(&self, delay: Duration, _f: impl FnOnce() + 'static) -> TimerId {
            self.timers.borrow_mut().push(delay);
            // Return a dummy timer ID for testing
            ic_cdk_timers::set_timer(Duration::from_secs(1), || {})
        }
    }

    fn setup_ttl(ttl: u64) {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow_mut() = ttl);
    }

    type TestStorage = std::rc::Rc<std::cell::RefCell<TokenFeeRepositoryStorage>>;
    type TestService = TokenFeeService<TestStorage, MockIcEnvironment, MockTokenFetcher>;

    fn create_service(current_time: u64) -> TestService {
        let repos = TestRepositories::new();
        let env = MockIcEnvironment {
            current_time,
            ..Default::default()
        };
        TokenFeeService::from_repositories(&repos, env, MockTokenFetcher::new())
    }

    fn create_service_with_fetcher(current_time: u64, fetcher: MockTokenFetcher) -> TestService {
        let repos = TestRepositories::new();
        let env = MockIcEnvironment {
            current_time,
            ..Default::default()
        };
        TokenFeeService::from_repositories(&repos, env, fetcher)
    }

    fn create_test_asset(principal_text: &str) -> Asset {
        Asset::IC {
            address: Principal::from_text(principal_text).unwrap(),
        }
    }

    #[test]
    fn should_success_clear_all_cached_fees() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);
        let mut service = create_service(1000);

        // Insert some fees directly via repo
        service.token_fee_repo.insert(
            "token1",
            CachedFee {
                fee: Nat::from(100u64),
                updated_at: 1000,
            },
        );
        service.token_fee_repo.insert(
            "token2",
            CachedFee {
                fee: Nat::from(200u64),
                updated_at: 1000,
            },
        );

        service.clear_all();

        // Verify cache is empty
        assert!(service.token_fee_repo.get("token1").is_none());
        assert!(service.token_fee_repo.get("token2").is_none());
    }

    #[test]
    fn should_success_clear_only_specific_token() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);
        let mut service = create_service(1000);

        service.token_fee_repo.insert(
            "token1",
            CachedFee {
                fee: Nat::from(100u64),
                updated_at: 1000,
            },
        );
        service.token_fee_repo.insert(
            "token2",
            CachedFee {
                fee: Nat::from(200u64),
                updated_at: 1000,
            },
        );

        service.clear_token("token1");

        assert!(service.token_fee_repo.get("token1").is_none());
        assert!(service.token_fee_repo.get("token2").is_some());
    }

    #[tokio::test]
    async fn should_success_fetch_all_tokens_on_cache_miss() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let p2 = Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap();
        fetcher.set_fee(p1, Nat::from(1000u64));
        fetcher.set_fee(p2, Nat::from(2000u64));

        let mut service = create_service_with_fetcher(1768451390000000300, fetcher.clone());
        let assets = vec![
            create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai"),
            create_test_asset("mxzaz-hqaaa-aaaar-qaada-cai"),
        ];

        let result: HashMap<Principal, Nat> = service.get_batch_tokens_fee(&assets).await.unwrap();

        assert_eq!(result.get(&p1), Some(&Nat::from(1000u64)));
        assert_eq!(result.get(&p2), Some(&Nat::from(2000u64)));
        assert_eq!(fetcher.get_call_count(&p1), 1);
        assert_eq!(fetcher.get_call_count(&p2), 1);
    }

    #[tokio::test]
    async fn should_success_return_empty_map_for_empty_assets() {
        let mut service = create_service(1768451390000000300);
        let result: HashMap<Principal, Nat> = service.get_batch_tokens_fee(&[]).await.unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn should_error_propagate_fetch_error() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        fetcher.set_error(p1, "canister unavailable");

        let mut service = create_service_with_fetcher(1768451390000000300, fetcher);
        let assets = vec![create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai")];

        let result: Result<HashMap<Principal, Nat>, CanisterError> =
            service.get_batch_tokens_fee(&assets).await;
        assert!(result.is_err());
    }
}
