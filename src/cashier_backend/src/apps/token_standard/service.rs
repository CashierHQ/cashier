// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError, repository::token_standard::CachedTokenStandard,
};
use cashier_common::runtime::IcEnvironment;
use std::{cell::RefCell, collections::HashMap};
use token_storage_types::token::IcrcStandard;

use crate::{
    apps::token_storage::traits::TokenStorageClient,
    repositories::{self, Repositories},
};

thread_local! {
    /// Configured TTL for token standard cache (nanoseconds)
    static TOKEN_STANDARD_TTL_NS: RefCell<u64> = const { RefCell::new(0) };
}

/// Service for managing token standards with caching
pub struct TokenStandardService<R: Repositories, T: TokenStorageClient, E: IcEnvironment> {
    pub token_standard_repository:
        repositories::token_standard::TokenStandardRepository<R::TokenStandard>,
    pub token_storage_client: T,
    pub ic_env: E,
}

impl<R: Repositories, T: TokenStorageClient, E: IcEnvironment> TokenStandardService<R, T, E> {
    pub fn new(repo: &R, token_storage_client: T, ic_env: E) -> Self {
        Self {
            token_standard_repository: repo.token_standard(),
            token_storage_client,
            ic_env,
        }
    }

    /// Initialize the service with TTL for caching
    /// # Arguments
    /// * `ttl` - Time to live in nanoseconds for cached token standards
    pub fn init(&self, ttl: u64) {
        TOKEN_STANDARD_TTL_NS.with(|t| {
            *t.borrow_mut() = ttl;
        });
    }

    /// Set the canister ID for the token storage client
    /// # Arguments
    /// * `canister_id` - The principal of the token storage canister
    pub fn set_token_storage_canister_id(&mut self, canister_id: Principal) {
        self.token_storage_client.set_canister_id(canister_id);
    }

    /// Clear the token standard cache
    pub fn clear_cache(&mut self) {
        self.token_standard_repository.clear();
    }

    /// Get token standards for a given token principal
    /// # Arguments
    /// * `token_principal` - The principal of the token to retrieve standards for
    /// # Returns
    /// * `Vec<IcrcStandard>` - The list of token standards
    pub async fn get_token_standards(
        &mut self,
        token_principal: &Principal,
    ) -> Result<Vec<IcrcStandard>, CanisterError> {
        let current_ts = self.ic_env.time();
        let ttl_ns = TOKEN_STANDARD_TTL_NS.with(|ttl| *ttl.borrow());

        // lookup from cache first
        if let Some(cached_standard) = self.token_standard_repository.get(token_principal) {
            // Check if cache is still valid
            if current_ts - cached_standard.updated_at < ttl_ns {
                return Ok(cached_standard.standards);
            }
        }

        // lookup the standards from token storage canister
        let standards: Vec<IcrcStandard> = self
            .token_storage_client
            .get_token_standards(token_principal)
            .await?;

        // cache the retrieved standards
        let cached_standard = CachedTokenStandard {
            standards: standards.clone(),
            updated_at: current_ts,
        };
        self.token_standard_repository
            .insert(token_principal, cached_standard);

        Ok(standards)
    }

    /// Get token standards for a batch of token principals
    /// # Arguments
    /// * `token_principals` - The list of token principals to retrieve standards for
    /// # Returns
    /// * `HashMap<Principal, Vec<IcrcStandard>>` - A map of token principals to their respective standards
    pub async fn get_batch_token_standards(
        &mut self,
        token_principals: &[Principal],
    ) -> Result<HashMap<Principal, Vec<IcrcStandard>>, CanisterError> {
        let mut standards_map: HashMap<Principal, Vec<IcrcStandard>> = HashMap::new();

        for token_principal in token_principals {
            let standards = self.get_token_standards(token_principal).await?;
            standards_map.insert(*token_principal, standards);
        }

        Ok(standards_map)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apps::shared::utils::tests::MockIcEnvironment;
    use crate::apps::token_storage::service::tests::MockTokenStorageClient;
    use crate::repositories::tests::TestRepositories;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::token::IcrcStandard;

    fn service_fixture(
        current_ts: u64,
    ) -> TokenStandardService<TestRepositories, MockTokenStorageClient, MockIcEnvironment> {
        let token_storage_client = MockTokenStorageClient::new();
        let repositories = TestRepositories::new();
        let ic_env = MockIcEnvironment::new(current_ts);

        TokenStandardService::new(&repositories, token_storage_client, ic_env)
    }

    #[tokio::test]
    async fn it_should_get_token_standards_from_token_storage_and_cache_them() {
        // Arrange
        let current_ts = 1_000_000_000u64; // 1 second
        let service = &mut service_fixture(current_ts);
        service.init(500_000_000_000); // 500 seconds TTL
        let ledger_id = random_principal_id();
        let standards = vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2];
        service
            .token_storage_client
            .token_standards_map
            .insert(ledger_id, standards.clone());

        // Act - First call should fetch from token storage canister
        let fetched_standards = service
            .get_token_standards(&ledger_id)
            .await
            .expect("Failed to get token standards");

        // Assert - token standards should be cached in the repository
        assert_eq!(fetched_standards, standards);
        let cache_standard = service
            .token_standard_repository
            .get(&ledger_id)
            .expect("Cached token standard should exist");
        assert_eq!(cache_standard.standards, standards);
        assert_eq!(cache_standard.updated_at, current_ts);
    }

    #[tokio::test]
    async fn it_should_get_token_standards_from_cache_if_not_expired() {
        // Arrange
        let current_ts = 1_000_000_000_000u64; // 1000 second
        let service = &mut service_fixture(current_ts);
        service.init(500_000_000_000); // 500 seconds TTL
        let ledger_id = random_principal_id();
        let standards = vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2];
        let cached_standard = CachedTokenStandard {
            standards: standards.clone(),
            updated_at: current_ts - 100_000_000_000, // Cached 100 seconds ago
        };
        service
            .token_standard_repository
            .insert(&ledger_id, cached_standard);

        // Act - Call to TokenStorage directly should fail because there is no standards associated with the ledger_id
        let fetched_standards_from_storage = service
            .token_storage_client
            .get_token_standards(&ledger_id)
            .await;
        assert!(
            fetched_standards_from_storage.is_err(),
            "Expected error when fetching from token storage canister for non-existing ledger_id"
        );

        // Act - Call to the cache service should return the cached standards since it's not expired
        let fetched_standards = service
            .get_token_standards(&ledger_id)
            .await
            .expect("Failed to get token standards");

        // Assert - token standards should be fetched from cache
        assert_eq!(fetched_standards, standards);
    }

    #[tokio::test]
    async fn it_should_refresh_cache_if_expired() {
        // Arrange
        let current_ts = 2_000_000_000_000u64; // 2000 second
        let service = &mut service_fixture(current_ts);
        service.init(500_000_000_000); // 500 seconds TTL
        let ledger_id = random_principal_id();
        let old_standards = vec![IcrcStandard::ICRC1];
        let cached_standard = CachedTokenStandard {
            standards: old_standards,
            updated_at: current_ts - 600_000_000_000, // Cached 600 seconds ago
        };
        service
            .token_standard_repository
            .insert(&ledger_id, cached_standard);

        let new_standards = vec![IcrcStandard::ICRC1, IcrcStandard::ICRC3];
        service
            .token_storage_client
            .token_standards_map
            .insert(ledger_id, new_standards.clone());

        // Act - Call to the cache service should refresh the cache since it's expired
        let fetched_standards = service
            .get_token_standards(&ledger_id)
            .await
            .expect("Failed to get token standards");

        // Assert - token standards should be fetched from token storage canister and cache should be updated
        assert_eq!(fetched_standards, new_standards);
        let cache_standard = service
            .token_standard_repository
            .get(&ledger_id)
            .expect("Cached token standard should exist");
        assert_eq!(cache_standard.standards, new_standards);
        assert_eq!(cache_standard.updated_at, current_ts);
    }

    #[tokio::test]
    async fn it_should_get_batch_token_standards() {
        // Arrange
        let current_ts = 3_000_000_000_000u64; // 3000 second
        let service = &mut service_fixture(current_ts);
        service.init(500_000_000_000); // 500 seconds TTL
        let ledger_id_1 = random_principal_id();
        let standards_1 = vec![IcrcStandard::ICRC1];
        service
            .token_storage_client
            .token_standards_map
            .insert(ledger_id_1, standards_1.clone());
        let ledger_id_2 = random_principal_id();
        let standards_2 = vec![IcrcStandard::ICRC2, IcrcStandard::ICRC3];
        service
            .token_storage_client
            .token_standards_map
            .insert(ledger_id_2, standards_2.clone());

        let token_principals = vec![ledger_id_1, ledger_id_2];

        // Act
        let fetched_standards_map = service
            .get_batch_token_standards(&token_principals)
            .await
            .expect("Failed to get batch token standards");

        // Assert
        assert_eq!(
            fetched_standards_map.get(&ledger_id_1).unwrap(),
            &standards_1
        );
        assert_eq!(
            fetched_standards_map.get(&ledger_id_2).unwrap(),
            &standards_2
        );
    }
}
