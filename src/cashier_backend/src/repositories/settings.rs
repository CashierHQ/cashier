use candid::CandidType;
use ic_mple_log::service::Storage;
use ic_stable_structures::{memory_manager::VirtualMemory, DefaultMemoryImpl, StableCell};
use cashier_macros::storable;

/// The canister settings
#[derive(Debug, CandidType, Clone, PartialEq, Eq)]
#[storable]
pub struct Settings {
    /// Whether the inspect message is enabled
    inspect_message_enabled: bool,
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

    /// Get the settings
    pub fn get(&self) -> Settings {
        self.storage.with_borrow(|store| store.get().clone())
    }

    /// Set the settings
    pub fn set(&mut self, settings: Settings) {
        self.storage.with_borrow_mut(|store| {
            store.set(settings);
        });
    }

    /// Get the inspect message enabled setting
    pub fn get_inspect_message_enabled(&self) -> bool {
        self.storage.with_borrow(|store| store.get().inspect_message_enabled.clone())
    }

    /// Set the inspect message enabled setting
    pub fn set_inspect_message_enabled(&mut self, inspect_message_enabled: bool) {
        self.update(|settings| {
            settings.inspect_message_enabled = inspect_message_enabled;
        });
    }

    /// Helper to update the settings
    fn update<F, T>(&mut self, f: F) -> T
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