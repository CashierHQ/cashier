// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::{CachedFee, FEE_CACHE_STORE, TOKEN_FEE_TTL_NS};
use crate::token_fee::fetcher::TokenFetcher;
use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::common::Asset;
use cashier_common::runtime::IcEnvironment;
use std::collections::HashMap;

/// Token fee caching service.
/// Caches token fees in memory with configurable TTL.
/// Generic over environment (for time) and fetcher (for external calls).
pub struct TokenFeeService<E: IcEnvironment, F: TokenFetcher> {
    ic_env: E,
    fetcher: F,
}

impl<E: IcEnvironment, F: TokenFetcher> TokenFeeService<E, F> {
    /// Create new TokenFeeService with environment and fetcher
    pub fn new(ic_env: E, fetcher: F) -> Self {
        Self { ic_env, fetcher }
    }

    /// Get cached fee by token key
    pub fn get(&self, key: &str) -> Option<CachedFee> {
        FEE_CACHE_STORE.with(|cell| cell.borrow().get(key).cloned())
    }

    /// Insert or update cached fee by key
    pub fn upsert(&self, key: &str, fee: Nat) {
        let updated_at = self.ic_env.time();
        let cache_fee = CachedFee { fee, updated_at };
        FEE_CACHE_STORE.with(|cell| {
            cell.borrow_mut().insert(key.to_string(), cache_fee);
        });
    }

    /// Get TTL in nanoseconds
    pub fn ttl_ns(&self) -> u64 {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow())
    }

    /// Clear all cached fees
    pub fn clear_all(&self) {
        FEE_CACHE_STORE.with(|cell| {
            cell.borrow_mut().clear();
        });
    }

    /// Clear cached fee for specific token
    pub fn clear_token(&self, token_key: &str) {
        FEE_CACHE_STORE.with(|cell| {
            cell.borrow_mut().remove(token_key);
        });
    }

    /// Check if cached fee is still valid (not expired)
    pub fn is_valid(&self, cached: &CachedFee) -> bool {
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

            if let Some(cached) = self.get(&key)
                && self.is_valid(&cached)
            {
                fee_map_result.insert(address, cached.fee);
                continue;
            }

            // Cache miss or expired - fetch fresh via injected fetcher
            let fee = self.fetcher.fetch_fee(address).await.map_err(|e| {
                CanisterError::CallCanisterFailed(format!("Failed to get fee for {}: {:?}", key, e))
            })?;

            self.upsert(&key, fee.clone());
            fee_map_result.insert(address, fee);
        }

        Ok(fee_map_result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::token_fee::fetcher::test_utils::MockTokenFetcher;
    use crate::utils::test_utils::runtime::MockIcEnvironment;
    use candid::Nat;
    use cashier_common::constant::DEFAULT_TOKEN_FEE_TTL_NS;

    fn setup_ttl(ttl: u64) {
        TOKEN_FEE_TTL_NS.with(|cell| *cell.borrow_mut() = ttl);
    }

    fn cleanup() {
        FEE_CACHE_STORE.with(|cell| cell.borrow_mut().clear());
    }

    fn create_service(current_time: u64) -> TokenFeeService<MockIcEnvironment, MockTokenFetcher> {
        let mut env = MockIcEnvironment::default();
        env.current_time = current_time;
        TokenFeeService::new(env, MockTokenFetcher::new())
    }

    fn create_service_with_fetcher(
        current_time: u64,
        fetcher: MockTokenFetcher,
    ) -> TokenFeeService<MockIcEnvironment, MockTokenFetcher> {
        let mut env = MockIcEnvironment::default();
        env.current_time = current_time;
        TokenFeeService::new(env, fetcher)
    }

    #[test]
    fn should_success_upsert_and_get_cached_fee() {
        cleanup();
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let service = create_service(1768451390000000300);
        service.upsert("token1", Nat::from(100u64));

        let cached = service.get("token1").unwrap();
        assert_eq!(cached.fee, Nat::from(100u64));
        assert_eq!(cached.updated_at, 1768451390000000300);
    }

    #[test]
    fn should_success_validate_ttl_expiration() {
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS); // 1000ns TTL

        let service = create_service(1768451390000000300);
        service.upsert("token1", Nat::from(100u64));
        let cached = service.get("token1").unwrap();
        assert!(service.is_valid(&cached));

        let service = create_service(1769747390000000000);
        let cached = service.get("token1").unwrap();
        assert!(!service.is_valid(&cached));
    }

    #[test]
    fn should_success_return_none_for_nonexistent_key() {
        cleanup();
        let service = create_service(1768451390000000300);
        assert!(service.get("nonexistent").is_none());
    }

    #[test]
    fn should_success_clear_all_cached_fees() {
        cleanup();
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let service = create_service(1768451390000000300);
        service.upsert("token1", Nat::from(100u64));
        service.upsert("token2", Nat::from(200u64));

        service.clear_all();

        assert!(service.get("token1").is_none());
        assert!(service.get("token2").is_none());
    }

    #[test]
    fn should_success_clear_only_specific_token() {
        cleanup();
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let service = create_service(1768451390000000300);
        service.upsert("token1", Nat::from(100u64));
        service.upsert("token2", Nat::from(200u64));
        service.upsert("token3", Nat::from(300u64));

        service.clear_token("token2");

        assert!(service.get("token1").is_some());
        assert!(service.get("token2").is_none());
        assert!(service.get("token3").is_some());
    }

    #[test]
    fn should_success_update_existing_cached_fee() {
        cleanup();
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let service = create_service(1768451390000000300);
        service.upsert("token1", Nat::from(100u64));

        // Update with new time
        let service = create_service(1768451390000000500);
        service.upsert("token1", Nat::from(999u64));

        let cached = service.get("token1").unwrap();
        assert_eq!(cached.fee, Nat::from(999u64));
        assert_eq!(cached.updated_at, 1768451390000000500);
    }

    #[test]
    fn should_success_cache_zero_fee_value() {
        cleanup();
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let service = create_service(1768451390000000300);
        service.upsert("token1", Nat::from(0u64));

        let cached = service.get("token1").unwrap();
        assert_eq!(cached.fee, Nat::from(0u64));
    }

    // ========== Batch fetch tests ==========

    fn create_test_asset(principal_text: &str) -> Asset {
        Asset::IC {
            address: Principal::from_text(principal_text).unwrap(),
        }
    }

    #[tokio::test]
    async fn should_success_fetch_all_tokens_on_cache_miss() {
        cleanup();
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
        cleanup();
        setup_ttl(DEFAULT_TOKEN_FEE_TTL_NS);

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        // Pre-populate cache
        let service = create_service_with_fetcher(1768451390000000300, fetcher.clone());
        service.upsert(&p1.to_text(), Nat::from(500u64));

        let assets = vec![create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai")];
        let result = service.get_batch_tokens_fee(&assets).await.unwrap();

        // Should return cached value, no fetch call
        assert_eq!(result.get(&p1), Some(&Nat::from(500u64)));
        assert_eq!(fetcher.get_call_count(&p1), 0);
    }

    #[tokio::test]
    async fn should_success_refetch_expired_cached_fees() {
        cleanup();
        setup_ttl(1000); // 1000ns TTL

        let fetcher = MockTokenFetcher::new();
        let p1 = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        fetcher.set_fee(p1, Nat::from(9999u64));

        // Insert at time T
        let service = create_service_with_fetcher(1000, fetcher.clone());
        service.upsert(&p1.to_text(), Nat::from(100u64));

        // Query at T + TTL + 1 (expired)
        let service = create_service_with_fetcher(2001, fetcher.clone());
        let assets = vec![create_test_asset("ryjl3-tyaaa-aaaaa-aaaba-cai")];
        let result = service.get_batch_tokens_fee(&assets).await.unwrap();

        // Should fetch fresh value
        assert_eq!(result.get(&p1), Some(&Nat::from(9999u64)));
        assert_eq!(fetcher.get_call_count(&p1), 1);
    }

    #[tokio::test]
    async fn should_success_return_empty_map_for_empty_assets() {
        cleanup();
        let service = create_service(1768451390000000300);
        let result = service.get_batch_tokens_fee(&[]).await.unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn should_error_propagate_fetch_error() {
        cleanup();
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
