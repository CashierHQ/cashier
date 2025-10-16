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

pub type SettingsRepositoryStorage = VersionedStableCell<Settings, SettingsCodec, VirtualMemory<DefaultMemoryImpl>>;

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
