// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::borrow::Cow;

pub use cashier_backend_types::rate_limit::RateLimitConfig;
use cashier_macros::storable;
use ic_mple_log::service::Storage;
use ic_mple_structures::{CellStructure, RefCodec, VersionedStableCell};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

#[storable]
pub enum RateLimitConfigCodec {
    V1(RateLimitConfig),
}

impl RefCodec<RateLimitConfig> for RateLimitConfigCodec {
    fn decode_ref(source: &Self) -> Cow<'_, RateLimitConfig> {
        match source {
            RateLimitConfigCodec::V1(cfg) => Cow::Borrowed(cfg),
        }
    }

    fn encode(dest: RateLimitConfig) -> Self {
        RateLimitConfigCodec::V1(dest)
    }
}

pub type RateLimitConfigRepositoryStorage =
    VersionedStableCell<RateLimitConfig, RateLimitConfigCodec, VirtualMemory<DefaultMemoryImpl>>;

/// Repository for the global rate limit configuration.
pub struct RateLimitConfigRepository<S: Storage<RateLimitConfigRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<RateLimitConfigRepositoryStorage>> RateLimitConfigRepository<S> {
    /// Create a new RateLimitConfigRepository.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Read the current rate limit configuration.
    pub fn read<F, T>(&self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a RateLimitConfig) -> T,
    {
        self.storage.with_borrow(|store| f(store.get().as_ref()))
    }

    /// Update the rate limit configuration.
    pub fn update<F, T>(&mut self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a mut RateLimitConfig) -> T,
    {
        self.storage.with_borrow_mut(|store| {
            let mut new_config = store.get().into_owned();
            let result = f(&mut new_config);
            store.set(new_config);
            result
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};

    fn fixture_of_config(enabled: bool, max_requests: u32, window_secs: u64) -> RateLimitConfig {
        RateLimitConfig {
            enabled,
            max_requests,
            window_secs,
        }
    }

    #[test]
    fn it_should_read_default_config() {
        // Arrange
        let repo = TestRepositories::new().rate_limit_config();

        // Act
        let config = repo.read(Clone::clone);

        // Assert
        assert_eq!(config, fixture_of_config(true, 1, 60));
    }

    #[test]
    fn it_should_update_config() {
        // Arrange
        let mut repo = TestRepositories::new().rate_limit_config();

        // Act
        repo.update(|cfg| {
            cfg.enabled = false;
            cfg.max_requests = 5;
            cfg.window_secs = 30;
        });
        let config = repo.read(Clone::clone);

        // Assert
        assert_eq!(config, fixture_of_config(false, 5, 30));
    }
}
