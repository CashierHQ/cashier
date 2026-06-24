use std::borrow::Cow;

use candid::{CandidType, Principal};
use cashier_macros::storable;
use ic_mple_log::service::Storage;
use ic_mple_structures::{CellStructure, RefCodec, VersionedStableCell};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

fn default_canister_id() -> Principal {
    Principal::anonymous()
}

/// The canister settings
#[derive(Debug, CandidType, Clone, PartialEq, Eq)]
#[storable]
pub struct Settings {
    /// Whether the inspect message is enabled
    pub inspect_message_enabled: bool,
    /// Token storage canister id (set at init or via admin endpoint; persisted in stable memory).
    /// Defaults to the anonymous principal when unset; `#[serde(default)]` keeps pre-migration
    /// records (without this field) decodable.
    #[serde(default = "default_canister_id")]
    pub token_storage_canister_id: Principal,
    /// Gate service canister id (set at init or via admin endpoint; persisted in stable memory).
    /// Defaults to the anonymous principal when unset; `#[serde(default)]` keeps pre-migration
    /// records (without this field) decodable.
    #[serde(default = "default_canister_id")]
    pub gate_service_canister_id: Principal,
}

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

impl Default for Settings {
    fn default() -> Self {
        Self {
            inspect_message_enabled: true,
            token_storage_canister_id: default_canister_id(),
            gate_service_canister_id: default_canister_id(),
        }
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
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};

    fn fixture_of_settings(inspect_message_enabled: bool) -> Settings {
        Settings {
            inspect_message_enabled,
            token_storage_canister_id: Principal::anonymous(),
            gate_service_canister_id: Principal::anonymous(),
        }
    }

    #[test]
    fn it_should_fail_change_settings_due_to_no_update_call() {
        // Arrange
        let repo = TestRepositories::new().settings();

        // Act
        let is_disabled = repo.read(|settings| !settings.inspect_message_enabled);

        // Assert
        assert!(!is_disabled);
    }

    #[test]
    fn it_should_succeed_read_default_settings() {
        // Arrange
        let repo = TestRepositories::new().settings();

        // Act
        let settings = repo.read(Clone::clone);

        // Assert
        assert_eq!(settings, fixture_of_settings(true));
    }

    #[test]
    fn it_should_succeed_update_settings() {
        // Arrange
        let mut repo = TestRepositories::new().settings();

        // Act
        repo.update(|settings| {
            settings.inspect_message_enabled = false;
        });
        let settings = repo.read(Clone::clone);

        // Assert
        assert_eq!(settings, fixture_of_settings(false));
    }

    #[test]
    fn it_should_succeed_return_callback_result_from_update() {
        // Arrange
        let mut repo = TestRepositories::new().settings();

        // Act
        let previous_value = repo.update(|settings| {
            let current = settings.inspect_message_enabled;
            settings.inspect_message_enabled = false;
            current
        });

        // Assert
        assert!(previous_value);
        assert_eq!(repo.read(Clone::clone), fixture_of_settings(false));
    }

    #[test]
    fn it_should_persist_canister_ids() {
        // Arrange
        let mut repo = TestRepositories::new().settings();
        // Distinct principals so a field-swap bug would fail the assertions.
        let ts_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let gate_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        // Act
        repo.update(|settings| {
            settings.token_storage_canister_id = ts_id;
            settings.gate_service_canister_id = gate_id;
        });
        let settings = repo.read(Clone::clone);

        // Assert
        assert_eq!(settings.token_storage_canister_id, ts_id);
        assert_eq!(settings.gate_service_canister_id, gate_id);
    }

    /// Backward-compat: a record written before the canister-id fields existed must still
    /// decode (CBOR via `#[storable]`), defaulting the new fields to the anonymous principal.
    /// Simulates the old stored shape `SettingsCodec::V1(Settings { inspect_message_enabled })`.
    #[test]
    fn it_should_decode_pre_migration_settings_record() {
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
        let settings = SettingsCodec::decode_ref(&codec).into_owned();

        // Assert: old field preserved, new fields default to the anonymous principal (no trap).
        assert!(!settings.inspect_message_enabled);
        assert_eq!(settings.token_storage_canister_id, Principal::anonymous());
        assert_eq!(settings.gate_service_canister_id, Principal::anonymous());
    }
}
