// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{error::CanisterError, repository::token_fee::CachedFee};
use cashier_common::runtime::IcEnvironment;
use std::{cell::RefCell, collections::HashMap};

use crate::{
    apps::token_fee::traits::{TokenFeeCache, TokenFetcher},
    repositories::{self, Repositories},
};

thread_local! {
    /// Configured TTL for token fee cache (nanoseconds)
    static TOKEN_FEE_TTL_NS: RefCell<u64> = const { RefCell::new(0) };
}

/// Token fee caching service with TTL-based expiration.
///
/// This service caches token transfer fees in memory with a configurable time-to-live (TTL)
/// to reduce redundant inter-canister calls. It is generic over:
/// - `R`: Repository layer for persistent storage
/// - `E`: IC environment abstraction for time access
/// - `F`: Token fetcher for retrieving fees from external canisters
///
/// Cached fees are automatically invalidated when they exceed the configured TTL,
/// triggering fresh fetches as needed.
pub struct TokenFeeService<R: Repositories, E: IcEnvironment, F: TokenFetcher> {
    pub token_fee_repo: repositories::token_fee::TokenFeeRepository<R::TokenFee>,
    pub ic_env: E,
    pub fetcher: F,
}

impl<R: Repositories, E: IcEnvironment, F: TokenFetcher> TokenFeeService<R, E, F> {
    /// Initializes the global TTL configuration for token fee caching.
    ///
    /// # Arguments
    ///
    /// * `ttl_ns` - Time-to-live in nanoseconds. Cached fees older than this will be considered expired.
    pub fn init(&self, ttl_ns: u64) {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow_mut() = ttl_ns);
    }

    /// Creates a new `TokenFeeService` instance.
    ///
    /// # Arguments
    ///
    /// * `repo` - Repository collection providing access to token fee storage
    /// * `ic_env` - IC environment abstraction for accessing system time
    /// * `fetcher` - Token fetcher implementation for retrieving fees from external canisters
    ///
    /// # Returns
    ///
    /// Returns a new service instance ready to cache and retrieve token fees.
    pub fn new(repo: &R, ic_env: E, fetcher: F) -> Self {
        Self {
            token_fee_repo: repo.token_fee(),
            ic_env,
            fetcher,
        }
    }

    /// Clears all cached token fees from the repository.
    ///
    /// This forces all subsequent fee queries to fetch fresh data from external canisters.
    /// Useful for testing or when a complete cache invalidation is needed.
    pub fn clear_all(&mut self) {
        self.token_fee_repo.clear();
    }

    /// Clears the cached fee for a specific token.
    ///
    /// # Arguments
    ///
    /// * `token_key` - The token identifier (typically the principal as text) to clear from cache
    ///
    /// The next query for this token will fetch fresh data from its canister.
    pub fn clear_token(&mut self, token_key: &Principal) {
        self.token_fee_repo.remove(token_key);
    }

    /// Checks if a cached fee is still valid based on TTL.
    ///
    /// # Arguments
    ///
    /// * `cached` - The cached fee entry to validate
    ///
    /// # Returns
    ///
    /// Returns `true` if the cached fee is still within the TTL window, `false` if expired.
    fn is_valid(&self, cached: &CachedFee) -> bool {
        self.ic_env.time().saturating_sub(cached.updated_at)
            < TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow())
    }
}

impl<R: Repositories, E: IcEnvironment, F: TokenFetcher> TokenFeeCache
    for TokenFeeService<R, E, F>
{
    async fn get_batch_tokens_fee(
        &mut self,
        token_addresses: &[Principal],
    ) -> Result<HashMap<Principal, Nat>, CanisterError> {
        let mut fee_map_result = HashMap::with_capacity(token_addresses.len());

        for address in token_addresses {
            // Check cache first
            if let Some(cached) = self.token_fee_repo.get(address)
                && self.is_valid(&cached)
            {
                fee_map_result.insert(*address, cached.fee.clone());
                continue;
            }

            // Cache miss or expired - fetch fresh via injected fetcher
            let fee = self.fetcher.fetch_fee(*address).await.map_err(|e| {
                CanisterError::CallCanisterFailed(format!(
                    "Failed to get fee for {}: {:?}",
                    address, e
                ))
            })?;

            // Cache the fetched fee
            let updated_at = self.ic_env.time();
            self.token_fee_repo.insert(
                address,
                CachedFee {
                    fee: fee.clone(),
                    updated_at,
                },
            );
            fee_map_result.insert(*address, fee);
        }

        Ok(fee_map_result)
    }
}

#[cfg(test)]
pub mod tests {
    use super::super::MockTokenFetcher;
    use super::*;
    use crate::{
        apps::shared::test_utils::tests::MockIcEnvironment, repositories::tests::TestRepositories,
    };
    use candid::Nat;
    use cashier_common::{constant::DEFAULT_TOKEN_FEE_TTL_NS, test_utils::random_principal_id};

    fn setup_ttl(ttl: u64) {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow_mut() = ttl);
    }

    pub type MockTokenFeeService =
        TokenFeeService<TestRepositories, MockIcEnvironment, MockTokenFetcher>;

    pub fn create_mock_service(current_time: u64) -> MockTokenFeeService {
        let repos = TestRepositories::new();
        let env = MockIcEnvironment::new(current_time);
        TokenFeeService::new(&repos, env, MockTokenFetcher::new())
    }

    fn create_mock_service_with_fetcher(
        current_time: u64,
        fetcher: MockTokenFetcher,
    ) -> MockTokenFeeService {
        let repos = TestRepositories::new();
        let env = MockIcEnvironment::new(current_time);
        TokenFeeService::new(&repos, env, fetcher)
    }

    #[test]
    fn it_should_success_clear_all_cached_fees() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);
        let mut service = create_mock_service(1000);
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();

        // Insert some fees directly via repo
        service.token_fee_repo.insert(
            &ledger_id1,
            CachedFee {
                fee: Nat::from(100u64),
                updated_at: 1000,
            },
        );
        service.token_fee_repo.insert(
            &ledger_id2,
            CachedFee {
                fee: Nat::from(200u64),
                updated_at: 1000,
            },
        );

        service.clear_all();

        // Verify cache is empty
        assert!(service.token_fee_repo.get(&ledger_id1).is_none());
        assert!(service.token_fee_repo.get(&ledger_id2).is_none());
    }

    #[test]
    fn it_should_success_clear_only_specific_token() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);
        let mut service = create_mock_service(1000);
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();

        service.token_fee_repo.insert(
            &ledger_id1,
            CachedFee {
                fee: Nat::from(100u64),
                updated_at: 1000,
            },
        );
        service.token_fee_repo.insert(
            &ledger_id2,
            CachedFee {
                fee: Nat::from(200u64),
                updated_at: 1000,
            },
        );

        service.clear_token(&ledger_id1);

        assert!(service.token_fee_repo.get(&ledger_id1).is_none());
        assert!(service.token_fee_repo.get(&ledger_id2).is_some());
    }

    #[tokio::test]
    async fn it_should_success_fetch_all_tokens_on_cache_miss() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        fetcher.set_fee(ledger_id1, Nat::from(1000u64));
        fetcher.set_fee(ledger_id2, Nat::from(2000u64));

        let mut service = create_mock_service_with_fetcher(1768451390000000300, fetcher.clone());
        let assets = vec![ledger_id1, ledger_id2];

        let result: HashMap<Principal, Nat> = service.get_batch_tokens_fee(&assets).await.unwrap();

        assert_eq!(result.get(&ledger_id1), Some(&Nat::from(1000u64)));
        assert_eq!(result.get(&ledger_id2), Some(&Nat::from(2000u64)));
        assert_eq!(fetcher.get_call_count(&ledger_id1), 1);
        assert_eq!(fetcher.get_call_count(&ledger_id2), 1);
    }

    #[tokio::test]
    async fn it_should_success_return_empty_map_for_empty_assets() {
        let mut service = create_mock_service(1768451390000000300);
        let result: HashMap<Principal, Nat> = service.get_batch_tokens_fee(&[]).await.unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn it_should_error_propagate_fetch_error() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let ledger_id = random_principal_id();
        fetcher.set_error(ledger_id, "canister unavailable");

        let mut service = create_mock_service_with_fetcher(1768451390000000300, fetcher);

        let result: Result<HashMap<Principal, Nat>, CanisterError> =
            service.get_batch_tokens_fee(&vec![ledger_id]).await;
        assert!(result.is_err());
    }
}
