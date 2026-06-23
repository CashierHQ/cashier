// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_macros::storable;
use ic_mple_log::service::Storage;
use ic_mple_structures::{CellStructure, RefCodec, VersionedStableCell};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::borrow::Cow;

/// Default canister id sentinel ("unset"): the anonymous principal. Used as struct `Default` and as
/// the serde default so pre-migration records (without the field) decode to it (CBOR `#[storable]`).
fn default_canister_id() -> Principal {
    Principal::anonymous()
}

/// The canister settings
#[derive(Debug, CandidType, Clone, PartialEq, Eq)]
#[storable]
pub struct Settings {
    /// Whether the inspect message is enabled
    pub inspect_message_enabled: bool,
    /// CKBTC minter canister id (set at init or via admin; persisted in stable memory).
    /// Defaults to the anonymous principal; `#[serde(default)]` keeps pre-migration records decodable.
    #[serde(default = "default_canister_id")]
    pub ckbtc_minter_id: Principal,
    /// Omnity Bitcoin canister id (set at init or via admin; persisted in stable memory).
    /// Defaults to the anonymous principal; `#[serde(default)]` keeps pre-migration records decodable.
    #[serde(default = "default_canister_id")]
    pub omnity_bitcoin_id: Principal,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            inspect_message_enabled: true,
            ckbtc_minter_id: default_canister_id(),
            omnity_bitcoin_id: default_canister_id(),
        }
    }
}

// IMPORTANT: `Settings` is CBOR-encoded (`#[storable]`). Any new field MUST be `#[serde(default)]`
// so pre-existing `V1` records still decode; otherwise add a `V2` variant + frozen old struct.
#[storable]
pub enum SettingsCodec {
    V1(Settings),
}

impl RefCodec<Settings> for SettingsCodec {
    fn decode_ref(source: &Self) -> Cow<'_, Settings> {
        match source {
            SettingsCodec::V1(settings) => Cow::Borrowed(settings),
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
