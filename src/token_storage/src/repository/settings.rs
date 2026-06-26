// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
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
    /// CKBTC minter canister id (set at init or via admin; persisted in stable memory).
    /// Defaults to the anonymous principal; `#[serde(default)]` keeps pre-migration records decodable.
    #[serde(default = "Principal::anonymous")]
    pub ckbtc_minter_id: Principal,
    /// Omnity Bitcoin canister id (set at init or via admin; persisted in stable memory).
    /// Defaults to the anonymous principal; `#[serde(default)]` keeps pre-migration records decodable.
    #[serde(default = "Principal::anonymous")]
    pub omnity_bitcoin_id: Principal,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            inspect_message_enabled: true,
            ckbtc_minter_id: Principal::anonymous(),
            omnity_bitcoin_id: Principal::anonymous(),
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
    /// Create a new `SettingsRepository`.
    /// # Arguments
    /// * `storage` - The stable-cell storage backing the settings
    /// # Returns
    /// * `SettingsRepository` - A new repository instance
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Read the settings via a closure (no clone of the whole record).
    /// # Arguments
    /// * `f` - Closure receiving `&Settings` and returning a derived value
    /// # Returns
    /// * `T` - Whatever the closure returns
    pub fn read<F, T>(&self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a Settings) -> T,
    {
        self.storage.with_borrow(|store| f(store.get().as_ref()))
    }

    /// Mutate the settings via a closure, persisting the result to stable memory.
    /// # Arguments
    /// * `f` - Closure receiving `&mut Settings`; mutations are written back atomically
    /// # Returns
    /// * `T` - Whatever the closure returns
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

    #[test]
    fn it_should_persist_canister_ids() {
        use candid::Principal;

        // Arrange
        let repositories = TestRepositories::new();
        let mut settings_repository = repositories.settings();
        // Distinct principals so a field-swap bug would fail the assertions.
        let ckbtc = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let omnity = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        // Act
        settings_repository.update(|settings| {
            settings.ckbtc_minter_id = ckbtc;
            settings.omnity_bitcoin_id = omnity;
        });

        // Assert
        assert_eq!(settings_repository.read(|s| s.ckbtc_minter_id), ckbtc);
        assert_eq!(settings_repository.read(|s| s.omnity_bitcoin_id), omnity);
    }

    /// Backward-compat: a record written before the canister-id fields existed must still decode
    /// (CBOR via `#[storable]`), defaulting the new fields to the anonymous principal.
    #[test]
    fn it_should_decode_pre_migration_settings_record() {
        use super::{Settings, SettingsCodec};
        use candid::Principal;
        use ic_mple_structures::RefCodec;
        use ic_stable_structures::Storable;
        use std::borrow::Cow;

        #[derive(serde::Serialize)]
        struct OldSettings {
            inspect_message_enabled: bool,
        }
        #[derive(serde::Serialize)]
        enum OldSettingsCodec {
            V1(OldSettings),
        }

        // Arrange: encode old-shape bytes (no canister-id fields).
        let mut bytes = Vec::new();
        ciborium::into_writer(
            &OldSettingsCodec::V1(OldSettings {
                inspect_message_enabled: false,
            }),
            &mut bytes,
        )
        .expect("encode old settings");

        // Act: decode with the current codec.
        let codec = SettingsCodec::from_bytes(Cow::Owned(bytes));
        let settings: Settings = SettingsCodec::decode_ref(&codec).into_owned();

        // Assert: old field preserved, new fields default to the anonymous principal (no trap).
        assert!(!settings.inspect_message_enabled);
        assert_eq!(settings.ckbtc_minter_id, Principal::anonymous());
        assert_eq!(settings.omnity_bitcoin_id, Principal::anonymous());
    }
}
