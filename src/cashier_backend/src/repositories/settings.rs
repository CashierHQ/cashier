use candid::CandidType;
use cashier_macros::storable;
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableCell, memory_manager::VirtualMemory};

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

pub type SettingsRepositoryStorage = StableCell<Settings, VirtualMemory<DefaultMemoryImpl>>;

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
        self.storage.with_borrow(|store| f(store.get()))
    }

    /// Helper to update the settings
    pub fn update<F, T>(&mut self, f: F) -> T
    where
        for<'a> F: FnOnce(&'a mut Settings) -> T,
    {
        self.storage.with_borrow_mut(|store| {
            let mut new_settings = store.get().clone();
            let result = f(&mut new_settings);
            store.set(new_settings);
            result
        })
    }
}
