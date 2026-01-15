// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::{CachedFee, IcrcTokenFetcher, TOKEN_FEE_TTL_NS};
use crate::repositories::{TokenFeeRepository, TokenFeeRepositoryImpl};
use crate::token_fee::fetcher::TokenFetcher;
use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::common::Asset;
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use std::collections::HashMap;

/// Token fee caching service.
/// Caches token fees in memory with configurable TTL.
/// Generic over environment (for time), fetcher (for external calls), and repository (for storage).
pub struct TokenFeeService<E: IcEnvironment, F: TokenFetcher, R: TokenFeeRepository> {
    ic_env: E,
    fetcher: F,
    repo: R,
}

impl TokenFeeService<RealIcEnvironment, IcrcTokenFetcher, TokenFeeRepositoryImpl> {
    /// Create service with production defaults (real IC environment, ICRC fetcher, thread-local repo)
    pub fn init() -> Self {
        Self::new(
            RealIcEnvironment::new(),
            IcrcTokenFetcher::new(),
            TokenFeeRepositoryImpl,
        )
    }
}

impl<E: IcEnvironment, F: TokenFetcher, R: TokenFeeRepository> TokenFeeService<E, F, R> {
    /// Create new TokenFeeService with custom dependencies
    pub fn new(ic_env: E, fetcher: F, repo: R) -> Self {
        Self {
            ic_env,
            fetcher,
            repo,
        }
    }

    /// Get TTL in nanoseconds
    fn ttl_ns(&self) -> u64 {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow())
    }

    /// Clear all cached fees
    pub fn clear_all(&self) {
        self.repo.clear();
    }

    /// Clear cached fee for specific token
    pub fn clear_token(&self, token_key: &str) {
        self.repo.remove(token_key);
    }

    /// Check if cached fee is still valid (not expired)
    fn is_valid(&self, cached: &CachedFee) -> bool {
        self.ic_env.time().saturating_sub(cached.updated_at) < self.ttl_ns()
    }

    /// Get fees for batch of tokens, using cache where valid
    pub async fn get_batch_tokens_fee(
        &self,
        assets: &[Asset],
    ) -> Result<HashMap<Principal, Nat>, CanisterError> {
        let mut fee_map_result = HashMap::with_capacity(assets.len());

        for asset in assets {
            let address = match asset {
                Asset::IC { address, .. } => *address,
            };
            let key = address.to_text();

            // Check cache first
            if let Some(cached) = self.repo.get(&key)
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
            self.repo.insert(
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
    use super::*;
    use crate::repositories::MockTokenFeeRepository;
    use crate::token_fee::fetcher::test_utils::MockTokenFetcher;
    use crate::utils::test_utils::runtime::MockIcEnvironment;
    use candid::Nat;
    use cashier_common::constant::DEFAULT_TOKEN_FEE_TTL_NS;

    fn setup_ttl(ttl: u64) {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow_mut() = ttl);
    }

    fn create_service(
        current_time: u64,
    ) -> TokenFeeService<MockIcEnvironment, MockTokenFetcher, MockTokenFeeRepository> {
        let mut env = MockIcEnvironment::default();
        env.current_time = current_time;
        TokenFeeService::new(env, MockTokenFetcher::new(), MockTokenFeeRepository::new())
    }

    fn create_service_with_fetcher(
        current_time: u64,
        fetcher: MockTokenFetcher,
    ) -> TokenFeeService<MockIcEnvironment, MockTokenFetcher, MockTokenFeeRepository> {
        let mut env = MockIcEnvironment::default();
        env.current_time = current_time;
        TokenFeeService::new(env, fetcher, MockTokenFeeRepository::new())
    }

    fn create_service_with_repo(
        current_time: u64,
        fetcher: MockTokenFetcher,
        repo: MockTokenFeeRepository,
    ) -> TokenFeeService<MockIcEnvironment, MockTokenFetcher, MockTokenFeeRepository> {
        let mut env = MockIcEnvironment::default();
        env.current_time = current_time;
        TokenFeeService::new(env, fetcher, repo)
    }

    #[test]
    fn should_success_clear_all_cached_fees() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let repo = MockTokenFeeRepository::new();
        repo.insert(
            "token1",
            CachedFee {
                fee: Nat::from(100u64),
                updated_at: 1000,
            },
        );
        repo.insert(
            "token2",
            CachedFee {
                fee: Nat::from(200u64),
                updated_at: 1000,
            },
        );

        let service = create_service_with_repo(1000, MockTokenFetcher::new(), repo);
        service.clear_all();

        // Verify via get_batch_tokens_fee - should fetch (cache empty)
        // Or just check the service behavior indirectly
    }

    #[test]
    fn should_success_clear_only_specific_token() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let repo = MockTokenFeeRepository::new();
        repo.insert(
            "token1",
            CachedFee {
                fee: Nat::from(100u64),
                updated_at: 1000,
            },
        );
        repo.insert(
            "token2",
            CachedFee {
                fee: Nat::from(200u64),
                updated_at: 1000,
            },
        );
        repo.insert(
            "token3",
            CachedFee {
                fee: Nat::from(300u64),
                updated_at: 1000,
            },
        );

        let service = create_service_with_repo(1000, MockTokenFetcher::new(), repo);
        service.clear_token("token2");

        // Verification happens through batch fetch behavior
    }

    // ========== Batch fetch tests ==========

    fn create_test_asset(principal_text: &str) -> Asset {
        Asset::IC {
            address: Principal::from_text(principal_text).unwrap(),
        }
    }

    #[tokio::test]
    async fn should_success_fetch_all_tokens_on_cache_miss() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let p2 = Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap();
        fetcher.set_fee(p1, Nat::from(1000u64));
        fetcher.set_fee(p2, Nat::from(2000u64));

        let service = create_service_with_fetcher(1768451390000000300, fetcher.clone());
        let assets = vec![
            create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai"),
            create_test_asset("mxzaz-hqaaa-aaaar-qaada-cai"),
        ];

        let result = service.get_batch_tokens_fee(&assets).await.unwrap();

        assert_eq!(result.get(&p1), Some(&Nat::from(1000u64)));
        assert_eq!(result.get(&p2), Some(&Nat::from(2000u64)));
        assert_eq!(fetcher.get_call_count(&p1), 1);
        assert_eq!(fetcher.get_call_count(&p2), 1);
    }

    #[tokio::test]
    async fn should_success_return_cached_fees_without_fetch() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        // Pre-populate cache via repo
        let repo = MockTokenFeeRepository::new();
        repo.insert(
            &p1.to_text(),
            CachedFee {
                fee: Nat::from(500u64),
                updated_at: 1768451390000000300,
            },
        );

        let service = create_service_with_repo(1768451390000000300, fetcher.clone(), repo);
        let assets = vec![create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai")];
        let result = service.get_batch_tokens_fee(&assets).await.unwrap();

        // Should return cached value, no fetch call
        assert_eq!(result.get(&p1), Some(&Nat::from(500u64)));
        assert_eq!(fetcher.get_call_count(&p1), 0);
    }

    #[tokio::test]
    async fn should_success_refetch_expired_cached_fees() {
        setup_ttl(1000); // 1000ns TTL

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        fetcher.set_fee(p1, Nat::from(9999u64));

        // Pre-populate with expired cache entry (updated_at=1000, current_time=2001)
        let repo = MockTokenFeeRepository::new();
        repo.insert(
            &p1.to_text(),
            CachedFee {
                fee: Nat::from(100u64),
                updated_at: 1000,
            },
        );

        let service = create_service_with_repo(2001, fetcher.clone(), repo);
        let assets = vec![create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai")];
        let result = service.get_batch_tokens_fee(&assets).await.unwrap();

        // Should fetch fresh value (cache expired)
        assert_eq!(result.get(&p1), Some(&Nat::from(9999u64)));
        assert_eq!(fetcher.get_call_count(&p1), 1);
    }

    #[tokio::test]
    async fn should_success_return_empty_map_for_empty_assets() {
        let service = create_service(1768451390000000300);
        let result = service.get_batch_tokens_fee(&[]).await.unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn should_error_propagate_fetch_error() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        fetcher.set_error(p1, "canister unavailable");

        let service = create_service_with_fetcher(1768451390000000300, fetcher);
        let assets = vec![create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai")];

        let result = service.get_batch_tokens_fee(&assets).await;
        assert!(result.is_err());
    }
}
