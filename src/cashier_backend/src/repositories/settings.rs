use std::borrow::Cow;

use candid::CandidType;
use cashier_macros::storable;
use ic_mple_log::service::Storage;
use ic_mple_structures::{CellStructure, RefCodec, VersionedStableCell};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

/// The canister settings
#[derive(Debug, CandidType, Clone, PartialEq, Eq)]
#[storable]
pub struct Settings {
    /// Whether the inspect message is enabled
    pub inspect_message_enabled: bool,
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

impl Default for Settings {
    fn default() -> Self {
        Self {
            inspect_message_enabled: true,
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
    /// Create a new SettingsRepository
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    // /// Set the settings
    // pub fn set(&mut self, settings: Settings) {
    //     self.storage.with_borrow_mut(|store| {
    //         store.set(settings);
    //     });
    // }

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
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};

    fn fixture_of_settings(inspect_message_enabled: bool) -> Settings {
        Settings {
            inspect_message_enabled,
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
}
