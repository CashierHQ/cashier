// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::borrow::Cow;

pub use cashier_backend_types::backoff::BackoffConfig;
use cashier_macros::storable;
use ic_mple_log::service::Storage;
use ic_mple_structures::{CellStructure, RefCodec, VersionedStableCell};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

#[storable]
pub enum BackoffConfigCodec {
    V1(BackoffConfig),
}

impl RefCodec<BackoffConfig> for BackoffConfigCodec {
    fn decode_ref(source: &Self) -> Cow<'_, BackoffConfig> {
        match source {
            BackoffConfigCodec::V1(cfg) => Cow::Borrowed(cfg),
        }
    }

    fn encode(dest: BackoffConfig) -> Self {
        BackoffConfigCodec::V1(dest)
    }
}

pub type BackoffConfigRepositoryStorage =
    VersionedStableCell<BackoffConfig, BackoffConfigCodec, VirtualMemory<DefaultMemoryImpl>>;

/// Repository for the global exponential backoff configuration.
pub struct BackoffConfigRepository<S: Storage<BackoffConfigRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<BackoffConfigRepositoryStorage>> BackoffConfigRepository<S> {
    /// Create a new BackoffConfigRepository.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Read the current backoff configuration.
    pub fn read<F, T>(&self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a BackoffConfig) -> T,
    {
        self.storage.with_borrow(|store| f(store.get().as_ref()))
    }

    /// Update the backoff configuration.
    pub fn update<F, T>(&mut self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a mut BackoffConfig) -> T,
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

    fn fixture_of_config(enabled: bool, base_wait_secs: u64) -> BackoffConfig {
        BackoffConfig {
            enabled,
            base_wait_secs,
        }
    }

    #[test]
    fn it_should_read_default_config() {
        // Arrange
        let repo = TestRepositories::new().backoff_config();

        // Act
        let config = repo.read(Clone::clone);

        // Assert
        assert_eq!(config, fixture_of_config(true, 180));
    }

    #[test]
    fn it_should_update_config() {
        // Arrange
        let mut repo = TestRepositories::new().backoff_config();

        // Act
        repo.update(|cfg| {
            cfg.enabled = false;
            cfg.base_wait_secs = 60;
        });
        let config = repo.read(Clone::clone);

        // Assert
        assert_eq!(config, fixture_of_config(false, 60));
    }
}
