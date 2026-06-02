// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;
use ic_mple_log::service::Storage;
use ic_mple_structures::{CellStructure, RefCodec, VersionedStableCell};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::borrow::Cow;

/// The canister settings
#[derive(Debug, CandidType, Clone, PartialEq, Eq)]
#[storable]
pub struct Settings {
    /// Whether the inspect message is enabled
    pub inspect_message_enabled: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            inspect_message_enabled: true,
        }
    }
}

#[storable]
pub enum SettingsCodec {
    V1(Settings),
}

impl RefCodec<Settings> for SettingsCodec {
    fn decode_ref(source: &Self) -> Cow<'_, Settings> {
        match source {
            SettingsCodec::V1(link) => Cow::Borrowed(link),
        }
    }

    fn encode(dest: Settings) -> Self {
        SettingsCodec::V1(dest)
    }
}

pub type SettingsRepositoryStorage =
    VersionedStableCell<Settings, SettingsCodec, VirtualMemory<DefaultMemoryImpl>>;

/// The settings repository
pub struct SettingsRepository<S: Storage<SettingsRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<SettingsRepositoryStorage>> SettingsRepository<S> {
    /// Create a new SettingsRepository
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Helper to read the settings
    pub fn read<F, T>(&self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a Settings) -> T,
    {
        self.storage.with_borrow(|store| f(store.get().as_ref()))
    }

    /// Helper to update the settings
    pub fn update<F, T>(&mut self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a mut Settings) -> T,
    {
        self.storage.with_borrow_mut(|store| {
            let mut new_settings = store.get().into_owned();
            let result = f(&mut new_settings);
            store.set(new_settings);
            result
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::repository::{Repositories, tests::TestRepositories};

    #[test]
    fn it_should_do_read_default_settings() {
        // Arrange
        let repositories = TestRepositories::new();
        let settings_repository = repositories.settings();

        // Act
        let result = settings_repository.read(|settings| settings.inspect_message_enabled);

        // Assert
        assert!(result);
    }

    #[test]
    fn it_should_do_update_settings() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut settings_repository = repositories.settings();

        // Act
        settings_repository.update(|settings| {
            settings.inspect_message_enabled = false;
        });
        let result = settings_repository.read(|settings| settings.inspect_message_enabled);

        // Assert
        assert!(!result);
    }

    #[test]
    fn it_should_do_return_value_from_update_closure() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut settings_repository = repositories.settings();

        // Act
        let result = settings_repository.update(|settings| {
            settings.inspect_message_enabled = false;
            settings.inspect_message_enabled
        });

        // Assert
        assert!(!result);
        assert!(!settings_repository.read(|settings| settings.inspect_message_enabled));
    }
}
